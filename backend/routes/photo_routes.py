from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import desc
from sqlalchemy.orm import Session

from config.database import get_db
from models.photo_model import Photo
from models.tag_model import Tag
from models.user_model import User
from schemas.photo_schema import (
    BestPhotosResponse,
    DeletePhotoResponse,
    DuplicateResponse,
    MapPoint,
    PhotoOut,
    PhotoUploadResponse,
    TagCloudResponse,
    TimelineResponse,
)
from services.ai_service import generate_caption, generate_tags
from services.cloudinary_service import delete_image, upload_image
from services.duplicate_service import find_duplicate_groups
from utils.auth_utils import get_current_user
from utils.image_utils import extract_gps_from_image_bytes


photos_router = APIRouter(prefix="/photos", tags=["photos"])
memories_router = APIRouter(prefix="/memories", tags=["memories"])
tags_router = APIRouter(prefix="/tags", tags=["tags"])


def _parse_tags(tags_json: str) -> List[str]:
    try:
        data = json.loads(tags_json or "[]")
        if isinstance(data, list):
            return [str(x) for x in data]
    except Exception:
        pass
    return []


def _set_tags(photo: Photo, tags: List[str]):
    cleaned = [t.strip().lower() for t in tags if t and str(t).strip()]
    # de-dup preserving order
    seen = set()
    unique = []
    for t in cleaned:
        if t not in seen:
            seen.add(t)
            unique.append(t)
    photo.tags = json.dumps(unique)


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


def _bump_tag_frequencies(db: Session, tags: List[str]):
    for t in tags:
        name = t.strip().lower()
        if not name:
            continue
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name, frequency=1)
            db.add(tag)
        else:
            tag.frequency += 1


@photos_router.get("", response_model=List[PhotoOut])
def list_photos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photos = (
        db.query(Photo)
        .filter(Photo.user_id == current_user.id)
        .order_by(desc(Photo.created_at))
        .all()
    )
    return [_photo_to_out(p) for p in photos]


@photos_router.post("/upload", response_model=PhotoUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Validate file type (mime type check)
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}. Only images are allowed.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    # Additional check: verify magic bytes for common image formats
    image_signatures = {
        b'\xFF\xD8\xFF': 'jpg',
        b'\x89PNG\r\n\x1a\n': 'png',
        b'RIFF': 'webp',
        b'\x00\x00\x01\x00': 'ico',
    }
    is_valid_image = any(contents.startswith(sig) for sig in image_signatures.keys())
    if not is_valid_image:
        raise HTTPException(status_code=400, detail="Invalid image file. Ensure it is a valid JPG, PNG, WebP, or other supported format.")

    latitude, longitude = extract_gps_from_image_bytes(contents)

    try:
        cloud_res = upload_image(file_bytes=contents, filename=file.filename or "upload")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    image_url = cloud_res.get("secure_url") or cloud_res.get("url")
    public_id = cloud_res.get("public_id")
    size_bytes = cloud_res.get("bytes")

    if not image_url or not public_id:
        raise HTTPException(status_code=500, detail="Cloudinary upload failed")

    # AI enrichment (do not fail upload if AI fails)
    caption = "Unable to analyze image"
    tags: List[str] = []
    try:
        caption = await generate_caption(image_url)
        tags = await generate_tags(image_url, top_k=5)
    except Exception:
        caption = "Unable to analyze image"
        tags = []

    photo = Photo(
        user_id=current_user.id,
        image_url=image_url,
        public_id=public_id,
        caption=caption,
        emotion=None,
        quality_score=None,
        latitude=latitude,
        longitude=longitude,
        bytes=int(size_bytes) if size_bytes is not None else None,
        created_at=datetime.utcnow(),
    )
    _set_tags(photo, tags)

    db.add(photo)
    _bump_tag_frequencies(db, _parse_tags(photo.tags))
    db.commit()
    db.refresh(photo)

    return PhotoUploadResponse(
        photo_id=photo.id,
        image_url=photo.image_url,
        public_id=photo.public_id,
        tags=_parse_tags(photo.tags),
        caption=photo.caption,
        quality_score=photo.quality_score,
    )


@photos_router.get("/best", response_model=BestPhotosResponse)
def best_photos(limit: int = 20, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photos = (
        db.query(Photo)
        .filter(Photo.user_id == current_user.id)
        .order_by(Photo.quality_score.desc().nullslast(), desc(Photo.created_at))
        .limit(min(limit, 100))
        .all()
    )
    return BestPhotosResponse(photos=[_photo_to_out(p) for p in photos])


@photos_router.get("/duplicates", response_model=DuplicateResponse)
def duplicate_photos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photos = db.query(Photo).filter(Photo.user_id == current_user.id).all()
    groups, total_savings = find_duplicate_groups(photos)

    # persist computed hashes
    db.commit()

    group_models = []
    for g in groups:
        group_photos = [db.query(Photo).filter(Photo.id == pid).first() for pid in g.photo_ids]
        group_models.append(
            {
                "group_id": g.group_id,
                "photos": [_photo_to_out(p) for p in group_photos if p],
                "similarity": g.similarity,
                "potential_savings_bytes": g.potential_savings_bytes,
            }
        )

    return {
        "groups": group_models,
        "total_groups": len(group_models),
        "potential_savings_bytes": total_savings,
    }


@photos_router.get("/{photo_id}", response_model=PhotoOut)
def get_photo(photo_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return _photo_to_out(photo)


@photos_router.delete("/{photo_id}", response_model=DeletePhotoResponse)
def delete_photo(photo_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    cloud_deleted = False
    try:
        cloud_deleted = delete_image(public_id=photo.public_id)
    except Exception:
        cloud_deleted = False

    db.delete(photo)
    db.commit()

    return DeletePhotoResponse(deleted=True, photo_id=photo_id, cloudinary_deleted=cloud_deleted)


@memories_router.get("/map", response_model=List[MapPoint])
def memory_map(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photos = (
        db.query(Photo)
        .filter(Photo.user_id == current_user.id, Photo.latitude.isnot(None), Photo.longitude.isnot(None))
        .order_by(desc(Photo.created_at))
        .all()
    )
    return [
        MapPoint(photo_id=p.id, image_url=p.image_url, latitude=float(p.latitude), longitude=float(p.longitude))
        for p in photos
        if p.latitude is not None and p.longitude is not None
    ]


@memories_router.get("/timeline", response_model=TimelineResponse)
def memory_timeline(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photos = (
        db.query(Photo)
        .filter(Photo.user_id == current_user.id)
        .order_by(desc(Photo.created_at))
        .all()
    )

    bucket = defaultdict(list)  # (year, month) -> [Photo]
    for p in photos:
        key = (p.created_at.year, p.created_at.strftime("%Y-%m"))
        bucket[key].append(p)

    years_map = defaultdict(list)
    for (year, month), ps in bucket.items():
        # title heuristic: top tag of the month
        tag_counts = defaultdict(int)
        for p in ps:
            for t in _parse_tags(p.tags):
                tag_counts[t] += 1
        top_tag = max(tag_counts.items(), key=lambda kv: kv[1])[0] if tag_counts else "memories"
        title = top_tag.replace("_", " ").title()
        cover = ps[0].image_url if ps else None
        years_map[year].append(
            {
                "title": title,
                "month": month,
                "photo_count": len(ps),
                "cover_image": cover,
                "photo_ids": [p.id for p in ps],
            }
        )

    years_out = []
    for year in sorted(years_map.keys(), reverse=True):
        events = sorted(years_map[year], key=lambda e: e["month"], reverse=True)
        years_out.append({"year": year, "events": events})

    return {"years": years_out}


@tags_router.get("/cloud", response_model=TagCloudResponse)
def tag_cloud(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Tags are global; for per-user cloud, consider deriving from Photo.tags.
    tags = db.query(Tag).order_by(desc(Tag.frequency)).limit(200).all()
    return {"tags": [{"name": t.name, "frequency": t.frequency} for t in tags]}
