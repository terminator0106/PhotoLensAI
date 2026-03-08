from __future__ import annotations

import json
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from models.photo_model import Photo
from models.user_model import User
from schemas.photo_schema import PhotoOut
from schemas.search_schema import PhotoSearchRequest, PhotoSearchResponse
from services.ai_service import extract_keywords
from utils.auth_utils import get_current_user


search_router = APIRouter(prefix="/search", tags=["search"])


def _parse_tags(tags_json: str) -> List[str]:
    try:
        data = json.loads(tags_json or "[]")
        if isinstance(data, list):
            return [str(x) for x in data]
    except Exception:
        pass
    return []


def _photo_to_out(photo: Photo) -> PhotoOut:
    return PhotoOut(
        id=photo.id,
        image_url=photo.image_url,
        public_id=photo.public_id,
        caption=photo.caption,
        tags=_parse_tags(photo.tags),
        emotion=photo.emotion,
        quality_score=photo.quality_score,
        latitude=photo.latitude,
        longitude=photo.longitude,
        created_at=photo.created_at,
    )


@search_router.post("/photos", response_model=PhotoSearchResponse)
def search_photos(payload: PhotoSearchRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    keywords = extract_keywords(payload.query)

    # Simple keyword matching against stored JSON tags and caption.
    # This is SQLite-friendly and works offline.
    q = db.query(Photo).filter(Photo.user_id == current_user.id)
    for kw in keywords[:10]:
        like = f"%{kw}%"
        q = q.filter((Photo.tags.like(like)) | (Photo.caption.like(like)))

    photos = q.order_by(Photo.created_at.desc()).limit(200).all()
    return PhotoSearchResponse(keywords=keywords, photos=[_photo_to_out(p) for p in photos])
