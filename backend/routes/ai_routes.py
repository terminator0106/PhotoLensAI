from __future__ import annotations

import json
from collections import Counter
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from config.database import get_db
from config.settings import settings
from models.photo_model import Photo
from models.user_model import User
from schemas.ai_schema import (
    AIInsightsResponse,
    EnhanceImageRequest,
    EnhanceImageResponse,
    GenerateStoryRequest,
    GenerateStoryResponse,
)
from services.ai_service import generate_story as generate_story_offline
from services.gemini_image_service import GeminiImageError, enhance_image_to_data_url as enhance_image_to_data_url_gemini
from services.groq_service import generate_story_groq
from services.duplicate_service import find_duplicate_groups
from services.local_enhance_service import LocalEnhanceError, enhance_image_to_data_url as enhance_image_to_data_url_local
from utils.auth_utils import get_current_user


ai_router = APIRouter(prefix="/ai", tags=["ai"])


def _parse_tags(tags_json: str):
    try:
        data = json.loads(tags_json or "[]")
        if isinstance(data, list):
            return [str(x) for x in data]
    except Exception:
        pass
    return []


@ai_router.post("/generate-story", response_model=GenerateStoryResponse)
async def generate_story_route(payload: GenerateStoryRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Support both legacy input (photo_ids) and Stage 7 input (photos).
    summaries = []
    captions: list[str] = []
    photo_urls: list[str] = []

    if payload.photos:
        for i, p in enumerate(payload.photos[:30]):
            summaries.append({"id": i, "caption": p.caption, "tags": p.tags})
            if p.caption:
                captions.append(p.caption)
    else:
        photo_ids = (payload.photo_ids or [])[:50]
        photos = (
            db.query(Photo)
            .filter(Photo.user_id == current_user.id, Photo.id.in_(photo_ids))
            .order_by(Photo.created_at.asc())
            .all()
        )
        if not photos:
            raise HTTPException(status_code=404, detail="No photos found")

        for p in photos:
            summaries.append(
                {
                    "id": p.id,
                    "caption": p.caption,
                    "tags": _parse_tags(p.tags),
                    "emotion": p.emotion,
                    "quality_score": p.quality_score,
                    "date": p.created_at.isoformat(),
                }
            )
            photo_urls.append(p.image_url)
            if p.caption:
                captions.append(p.caption)

    # Prefer Groq when configured; fallback to offline generator.
    try:
        story_raw = await generate_story_groq(captions=captions, prompt=payload.prompt)
        # Attempt to parse as structured story pages
        from schemas.ai_schema import StoryPage
        
        try:
            pages_data = json.loads(story_raw)
            if isinstance(pages_data, list):
                pages = []
                for p_data in pages_data:
                    idx = p_data.get("image_index", 0)
                    url = photo_urls[idx] if 0 <= idx < len(photo_urls) else (photo_urls[0] if photo_urls else None)
                    pages.append(StoryPage(
                        page=p_data.get("page", 1),
                        text=p_data.get("text", ""),
                        image_index=idx,
                        image_url=url
                    ))
                return GenerateStoryResponse(story=story_raw, pages=pages)
        except Exception:
            # Fallback to plain story if JSON parsing fails
            return GenerateStoryResponse(story=story_raw)
            
    except Exception:
        story = generate_story_offline(photo_summaries=summaries, prompt=payload.prompt)
        return GenerateStoryResponse(story=story)


@ai_router.post("/enhance-image", response_model=EnhanceImageResponse)
async def enhance_image(payload: EnhanceImageRequest, current_user: User = Depends(get_current_user)):
    image_url = (payload.image_url or "").strip()
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url is required")

    provider = (settings.ENHANCE_PROVIDER or "local").strip().lower()
    try:
        if provider == "gemini":
            enhanced_data_url = await enhance_image_to_data_url_gemini(image_url)
            prediction_id = "gemini"
        else:
            enhanced_data_url = await enhance_image_to_data_url_local(image_url)
            prediction_id = "local"
    except LocalEnhanceError as e:
        raise HTTPException(status_code=502, detail=str(e) or "Local enhancement failed")
    except GeminiImageError as e:
        msg = str(e) or "Gemini enhancement failed"
        raise HTTPException(status_code=503, detail=msg)
    except Exception as e:
        msg = str(e) or "Enhancement failed"
        if settings.ENV.lower() == "dev":
            raise HTTPException(status_code=502, detail=msg)
        raise HTTPException(status_code=502, detail="Enhancement failed")

    return EnhanceImageResponse(
        enhanced_image_url=enhanced_data_url,
        status="done",
        prediction_id=prediction_id,
    )


@ai_router.get("/insights", response_model=AIInsightsResponse)
def insights(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_photos = db.query(func.count(Photo.id)).filter(Photo.user_id == current_user.id).scalar() or 0

    photos_all = db.query(Photo).filter(Photo.user_id == current_user.id).all()

    # total_tags = sum of all stored tags across photos
    tag_counter: Counter[str] = Counter()
    total_tags = 0
    for p in photos_all:
        tags = _parse_tags(p.tags)
        total_tags += len(tags)
        tag_counter.update([t.lower() for t in tags if t])

    most_common_tags = [name for name, _ in tag_counter.most_common(5)]

    best_photos = (
        db.query(func.count(Photo.id))
        .filter(Photo.user_id == current_user.id, Photo.quality_score.isnot(None), Photo.quality_score >= 85)
        .scalar()
        or 0
    )

    # Mood distribution (Stage 6B): happy/calm/other percentages
    em_counts = Counter()
    for p in photos_all:
        em = (p.emotion or "").strip().lower()
        if em == "happy":
            em_counts["happy"] += 1
        elif em == "calm":
            em_counts["calm"] += 1
        else:
            em_counts["other"] += 1

    total_em = sum(em_counts.values()) or 1
    mood_distribution: Dict[str, float] = {
        k: round((v / total_em) * 100.0, 2) for k, v in em_counts.items()
    }

    # Duplicate estimate (can be slow if many photos without cached hashes)
    photos = photos_all[:300]
    groups, _ = find_duplicate_groups(photos)
    db.commit()
    dup_photo_ids = set()
    for g in groups:
        dup_photo_ids.update(g.photo_ids)

    return AIInsightsResponse(
        total_photos=total_photos,
        total_tags=total_tags,
        most_common_tags=most_common_tags,
        duplicate_photos=len(dup_photo_ids),
        best_photos=best_photos,
        mood_distribution=mood_distribution,
    )
