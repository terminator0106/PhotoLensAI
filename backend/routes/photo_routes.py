from __future__ import annotations

import base64
import json
import re
from collections import defaultdict
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from config.database import get_db
from models.photo_model import Photo
from models.tag_model import Tag
from models.user_model import User
from schemas.photo_schema import (
    BestPhotosResponse,
    DeletePhotoResponse,
    MapPoint,
    PhotoOut,
    PhotoUploadResponse,
    SaveEnhancedPhotoRequest,
    TagCloudResponse,
    TimelineResponse,
)
from schemas.search_schema import PhotoSearchRequest, PhotoSearchResponse
from services.ai_service import generate_caption, generate_tags
from services.cloudinary_service import delete_image, upload_image
from services.duplicate_service import ensure_photo_hash, find_duplicate_groups
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
        emotion="unknown",
        quality_score=0,
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
        id=photo.id,
        photo_id=photo.id,
        image_url=photo.image_url,
        public_id=photo.public_id,
        tags=_parse_tags(photo.tags),
        caption=photo.caption,
        quality_score=photo.quality_score,
    )


def _decode_data_url(data_url: str) -> bytes:
    raw = (data_url or "").strip()
    if not raw.startswith("data:"):
        raise HTTPException(status_code=400, detail="enhanced_data_url must be a data: URL")

    try:
        header, b64 = raw.split(",", 1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid data URL")

    if ";base64" not in header.lower():
        raise HTTPException(status_code=400, detail="Data URL must be base64 encoded")

    mime = header[5:].split(";", 1)[0].strip().lower()
    if not mime.startswith("image/"):
        raise HTTPException(status_code=400, detail="Data URL must be an image")

    try:
        return base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")


@photos_router.post("/save-enhanced", response_model=PhotoUploadResponse)
async def save_enhanced_photo(
    payload: SaveEnhancedPhotoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    original = (
        db.query(Photo)
        .filter(Photo.user_id == current_user.id, Photo.id == int(payload.original_photo_id))
        .first()
    )
    if not original:
        raise HTTPException(status_code=404, detail="Original photo not found")

    img_bytes = _decode_data_url(payload.enhanced_data_url)
    if not img_bytes:
        raise HTTPException(status_code=400, detail="Empty enhanced image")

    # Basic image signature check (same set as /upload)
    image_signatures = {
        b"\xFF\xD8\xFF": "jpg",
        b"\x89PNG\r\n\x1a\n": "png",
        b"RIFF": "webp",
        b"\x00\x00\x01\x00": "ico",
    }
    is_valid_image = any(img_bytes.startswith(sig) for sig in image_signatures.keys())
    if not is_valid_image:
        raise HTTPException(status_code=400, detail="Invalid enhanced image data")

    try:
        cloud_res = upload_image(file_bytes=img_bytes, filename=f"enhanced_{original.id}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    image_url = cloud_res.get("secure_url") or cloud_res.get("url")
    public_id = cloud_res.get("public_id")
    size_bytes = cloud_res.get("bytes")
    if not image_url or not public_id:
        raise HTTPException(status_code=500, detail="Cloudinary upload failed")

    # Create a new photo entry (keep original metadata where available)
    caption = (original.caption or "").strip() or "Enhanced photo"
    tags = _parse_tags(original.tags)

    photo = Photo(
        user_id=current_user.id,
        image_url=image_url,
        public_id=public_id,
        caption=caption,
        emotion=original.emotion,
        quality_score=original.quality_score,
        latitude=original.latitude,
        longitude=original.longitude,
        bytes=int(size_bytes) if size_bytes is not None else None,
        created_at=datetime.utcnow(),
    )
    _set_tags(photo, tags)

    db.add(photo)
    _bump_tag_frequencies(db, _parse_tags(photo.tags))
    db.commit()
    db.refresh(photo)

    return PhotoUploadResponse(
        id=photo.id,
        photo_id=photo.id,
        image_url=photo.image_url,
        public_id=photo.public_id,
        tags=_parse_tags(photo.tags),
        caption=photo.caption,
        quality_score=photo.quality_score,
    )


@photos_router.post("/search", response_model=PhotoSearchResponse)
def search_photos(payload: PhotoSearchRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Stage 5: simple keyword search against tags + caption
    query = (payload.query or "").strip().lower()
    keywords = [k for k in re.split(r"[^a-zA-Z0-9]+", query) if k]
    keywords = keywords[:12]

    if not keywords:
        return PhotoSearchResponse(keywords=[], photos=[])

    q = db.query(Photo).filter(Photo.user_id == current_user.id)
    # Match ANY keyword
    any_filter = None
    for kw in keywords:
        like = f"%{kw}%"
        cond = (Photo.tags.like(like)) | (Photo.caption.like(like))
        any_filter = cond if any_filter is None else (any_filter | cond)
    if any_filter is not None:
        q = q.filter(any_filter)

    candidates = q.order_by(desc(Photo.created_at)).limit(400).all()

    scored: list[tuple[int, Photo]] = []
    for p in candidates:
        tags = _parse_tags(p.tags)
        tag_set = set([t.lower() for t in tags])
        match_count = sum(1 for kw in keywords if kw in tag_set)
        # If nothing matched by exact-tag, allow caption matches but score lower.
        if match_count == 0 and p.caption:
            cap = p.caption.lower()
            if any(kw in cap for kw in keywords):
                match_count = 1
        scored.append((match_count, p))

    scored.sort(key=lambda x: (x[0], x[1].created_at), reverse=True)
    photos = [_photo_to_out(photo) for score, photo in scored[:200] if score > 0]

    return PhotoSearchResponse(keywords=keywords, photos=photos)


class PhotoBatchRequest(BaseModel):
    photo_ids: List[int] = Field(min_length=1, max_length=200)


@photos_router.post("/batch", response_model=List[PhotoOut])
def batch_photos(payload: PhotoBatchRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Return photos by id (preserve request order) for the current user.
    raw_ids = [int(x) for x in (payload.photo_ids or []) if isinstance(x, int) or str(x).isdigit()]
    if not raw_ids:
        return []

    # de-dup while preserving order + hard cap
    seen = set()
    ids: List[int] = []
    for pid in raw_ids:
        if pid in seen:
            continue
        seen.add(pid)
        ids.append(pid)
        if len(ids) >= 200:
            break

    photos = db.query(Photo).filter(Photo.user_id == current_user.id, Photo.id.in_(ids)).all()
    by_id = {p.id: p for p in photos}
    return [_photo_to_out(by_id[pid]) for pid in ids if pid in by_id]


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


@photos_router.get("/duplicates", response_model=None)
def duplicate_photos(format: str = "spec", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photos = db.query(Photo).filter(Photo.user_id == current_user.id).order_by(desc(Photo.created_at)).all()
    groups, total_savings = find_duplicate_groups(photos)

    # persist computed hashes
    db.commit()

    # Legacy format used by current frontend
    if (format or "").lower() == "legacy":
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

    # Stage 7 spec format (root list)
    # Compute similarity_score from actual pHash distances.
    try:
        import imagehash
    except Exception:
        raise HTTPException(status_code=500, detail="imagehash is not installed")

    def _dist(a_hex: str, b_hex: str) -> int:
        ha = imagehash.hex_to_hash(a_hex)
        hb = imagehash.hex_to_hash(b_hex)
        return int(ha - hb)

    def _score_from_dist(dist: int, bits: int = 64) -> int:
        dist = max(0, int(dist))
        score = round((1.0 - (dist / float(bits))) * 100.0)
        return int(max(0, min(100, score)))

    photo_by_id = {p.id: p for p in photos}
    out = []
    for g in groups:
        if not g.photo_ids:
            continue

        original = photo_by_id.get(g.photo_ids[0])
        if not original:
            continue

        # Ensure hashes exist and are compatible
        orig_hash = ensure_photo_hash(original)
        if not orig_hash:
            continue

        duplicates_urls = []
        sim_scores = []
        for pid in g.photo_ids[1:]:
            p = photo_by_id.get(pid)
            if not p:
                continue
            ph = ensure_photo_hash(p)
            if not ph:
                continue
            duplicates_urls.append(p.image_url)
            try:
                sim_scores.append(_score_from_dist(_dist(orig_hash, ph)))
            except Exception:
                continue

        if not duplicates_urls:
            continue

        # Use the minimum similarity among duplicates as the group score.
        similarity_score = int(min(sim_scores) if sim_scores else 0)
        out.append({"original": original.image_url, "duplicates": duplicates_urls, "similarity_score": similarity_score})

    # persist computed hashes
    db.commit()
    return out


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


@memories_router.get("/map", response_model=None)
def memory_map(format: str = "spec", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fmt = (format or "spec").lower()

    photos = (
        db.query(Photo)
        .filter(Photo.user_id == current_user.id)
        .order_by(desc(Photo.created_at))
        .all()
    )

    # Legacy format (frontend)
    if fmt == "legacy":
        geo = [p for p in photos if p.latitude is not None and p.longitude is not None]
        return [
            MapPoint(photo_id=p.id, image_url=p.image_url, latitude=float(p.latitude), longitude=float(p.longitude)).model_dump()
            for p in geo
        ]

    # Stage 8 spec format: always include a point; if missing GPS, assign dummy coords.
    base_lat = 19.0760
    base_lng = 72.8777

    out = []
    for p in photos:
        if p.latitude is not None and p.longitude is not None:
            lat = float(p.latitude)
            lng = float(p.longitude)
        else:
            # deterministic small jitter so markers don't stack perfectly
            jitter = ((p.id % 97) - 48) / 10000.0
            lat = base_lat + jitter
            lng = base_lng - jitter
        out.append({"image_url": p.image_url, "lat": lat, "lng": lng})

    return out


@memories_router.get("/timeline", response_model=None)
def memory_timeline(format: str = "spec", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photos = (
        db.query(Photo)
        .filter(Photo.user_id == current_user.id)
        .order_by(desc(Photo.created_at))
        .all()
    )

    fmt = (format or "spec").lower()

    # Stage 8 spec format: { "2024": [photos...], "2023": [photos...] }
    if fmt != "legacy":
        by_year = defaultdict(list)
        for p in photos:
            year = str(p.created_at.year)
            by_year[year].append(_photo_to_out(p).model_dump())
        return dict(by_year)

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

    return TimelineResponse(years=years_out).model_dump()

    return {"years": years_out}


@tags_router.get("/cloud", response_model=TagCloudResponse)
def tag_cloud(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Tags are global; for per-user cloud, consider deriving from Photo.tags.
    tags = db.query(Tag).order_by(desc(Tag.frequency)).limit(200).all()
    return {"tags": [{"name": t.name, "frequency": t.frequency} for t in tags]}
