from __future__ import annotations

import json
from collections import Counter
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from config.database import get_db
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
from services.groq_service import generate_story_groq
from services.duplicate_service import find_duplicate_groups
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
            if p.caption:
                captions.append(p.caption)

    # Prefer Groq when configured; fallback to offline generator.
    try:
        story = await generate_story_groq(captions=captions, prompt=payload.prompt)
    except Exception:
        story = generate_story_offline(photo_summaries=summaries, prompt=payload.prompt)

    return GenerateStoryResponse(story=story)


@ai_router.post("/enhance-image", response_model=EnhanceImageResponse)
async def enhance_image(payload: EnhanceImageRequest, current_user: User = Depends(get_current_user)):
    image_url = (payload.image_url or "").strip()
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url is required")

    # Replicate-based enhancement was removed. Enhancement is now performed client-side.
    raise HTTPException(
        status_code=410,
        detail="Image enhancement has moved to the frontend (UpscalerJS). This endpoint is deprecated.",
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
