from __future__ import annotations

import json
from collections import Counter
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from config.database import get_db
from models.photo_model import Photo
from models.tag_model import Tag
from models.user_model import User
from schemas.ai_schema import AIInsightsResponse, GenerateStoryRequest, GenerateStoryResponse
from services.ai_service import generate_story
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
def generate_story_route(payload: GenerateStoryRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photos = (
        db.query(Photo)
        .filter(Photo.user_id == current_user.id, Photo.id.in_(payload.photo_ids))
        .order_by(Photo.created_at.asc())
        .all()
    )
    if not photos:
        raise HTTPException(status_code=404, detail="No photos found")

    summaries = []
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

    story = generate_story(photo_summaries=summaries, prompt=payload.prompt)
    return GenerateStoryResponse(story=story)


@ai_router.get("/insights", response_model=AIInsightsResponse)
def insights(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_photos = db.query(func.count(Photo.id)).filter(Photo.user_id == current_user.id).scalar() or 0
    total_tags = db.query(func.count(Tag.id)).scalar() or 0

    best_photos = (
        db.query(func.count(Photo.id))
        .filter(Photo.user_id == current_user.id, Photo.quality_score.isnot(None), Photo.quality_score >= 85)
        .scalar()
        or 0
    )

    # Mood distribution
    emotions = (
        db.query(Photo.emotion)
        .filter(Photo.user_id == current_user.id, Photo.emotion.isnot(None))
        .all()
    )
    c = Counter([e[0] for e in emotions if e[0]])
    total_em = sum(c.values()) or 1
    mood_distribution: Dict[str, float] = {k: round((v / total_em) * 100.0, 2) for k, v in c.items()}

    # Duplicate estimate (can be slow if many photos without cached hashes)
    photos = db.query(Photo).filter(Photo.user_id == current_user.id).limit(300).all()
    groups, _ = find_duplicate_groups(photos)
    db.commit()
    dup_photo_ids = set()
    for g in groups:
        dup_photo_ids.update(g.photo_ids)

    return AIInsightsResponse(
        total_photos=total_photos,
        total_tags=total_tags,
        duplicate_photos=len(dup_photo_ids),
        best_photos=best_photos,
        mood_distribution=mood_distribution,
    )
