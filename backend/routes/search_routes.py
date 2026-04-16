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
import re

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
    # Keep extract_keywords for backwards compatibility, but apply Stage 5 behavior:
    # - ANY keyword match
    # - rank by number of matching tags
    raw = (payload.query or "").strip().lower()
    keywords = extract_keywords(payload.query)
    if not keywords:
        keywords = [k for k in re.split(r"[^a-zA-Z0-9]+", raw) if k]
    keywords = keywords[:12]

    if not keywords:
        return PhotoSearchResponse(keywords=[], photos=[])

    q = db.query(Photo).filter(Photo.user_id == current_user.id)
    any_filter = None
    for kw in keywords:
        like = f"%{kw}%"
        cond = (Photo.tags.like(like)) | (Photo.caption.like(like))
        any_filter = cond if any_filter is None else (any_filter | cond)
    if any_filter is not None:
        q = q.filter(any_filter)

    candidates = q.order_by(Photo.created_at.desc()).limit(400).all()

    scored = []
    for p in candidates:
        tags = _parse_tags(p.tags)
        tag_set = set([t.lower() for t in tags])
        match_count = sum(1 for kw in keywords if kw in tag_set)
        if match_count == 0 and p.caption:
            cap = p.caption.lower()
            if any(kw in cap for kw in keywords):
                match_count = 1
        scored.append((match_count, p))

    scored.sort(key=lambda x: (x[0], x[1].created_at), reverse=True)
    photos = [_photo_to_out(photo) for score, photo in scored[:200] if score > 0]

    return PhotoSearchResponse(keywords=keywords, photos=photos)
