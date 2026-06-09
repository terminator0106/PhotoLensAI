from __future__ import annotations

import json
import re
from collections import defaultdict
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from models.album_model import Album
from models.photo_model import Photo
from models.user_model import User
from schemas.album_schema import (
    AddPhotoToAlbumRequest,
    AlbumCreate,
    AlbumOut,
    AlbumWithPhotos,
    SmartAlbumsResponse,
)
from schemas.photo_schema import PhotoOut
from utils.auth_utils import get_current_user


albums_router = APIRouter(prefix="/albums", tags=["albums"])


def _parse_tags(tags_json: str) -> List[str]:
    try:
        data = json.loads(tags_json or "[]")
        if isinstance(data, list):
            out: List[str] = []
            for x in data:
                s = str(x).strip().lower()
                if s:
                    out.append(s)
            return out
    except Exception:
        pass
    return []


def _tokenize(text: str) -> List[str]:
    return [t for t in re.split(r"[^a-z0-9]+", (text or "").lower()) if t]


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


SMART_ALBUMS: Dict[str, List[str]] = {
    # Note: keywords are token-matched against both tags and caption.
    # Keep these as single tokens (spaces are tokenized).
    "Pets": [
        "dog",
        "cat",
        "pet",
        "puppy",
        "kitten",
        "retriever",
        "labrador",
        "poodle",
        "bulldog",
        "terrier",
        "beagle",
        "husky",
        "shepherd",
        "tabby",
        "siamese",
        "persian",
        "rabbit",
        "bunny",
        "hamster",
        "horse",
        "pony",
        "bird",
        "parrot",
        "fish",
        "aquarium",
    ],
    "Food": [
        "food",
        "meal",
        "restaurant",
        "coffee",
        "tea",
        "pizza",
        "burger",
        "sandwich",
        "sushi",
        "pasta",
        "noodle",
        "cake",
        "dessert",
        "ice",
        "cream",
        "chocolate",
        "breakfast",
        "lunch",
        "dinner",
        "salad",
    ],
    "Travel": [
        "travel",
        "trip",
        "vacation",
        "beach",
        "mountain",
        "hotel",
        "flight",
        "airplane",
        "airport",
        "train",
        "station",
        "city",
        "street",
        "bridge",
        "monument",
        "temple",
        "museum",
        "tourist",
        "tourism",
    ],
    "Nature": [
        "nature",
        "tree",
        "sunset",
        "forest",
        "sea",
        "ocean",
        "sky",
        "flower",
        "flowers",
        "lake",
        "river",
        "waterfall",
        "mountain",
        "landscape",
        "garden",
        "wildlife",
        "outdoor",
        "scenery",
        "beach",
    ],
    "Events": [
        "event",
        "wedding",
        "birthday",
        "party",
        "celebration",
        "festival",
        "ceremony",
        "graduation",
        "anniversary",
        "concert",
        "christmas",
        "halloween",
        "new",
        "year",
    ],
}


@albums_router.post("", response_model=AlbumOut)
def create_album(payload: AlbumCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    album = Album(user_id=current_user.id, name=payload.name.strip(), cover_image=payload.cover_image)
    db.add(album)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Album with this name already exists")
    db.refresh(album)
    return album


@albums_router.get("", response_model=List[AlbumOut])
def list_albums(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    albums = db.query(Album).filter(Album.user_id == current_user.id).order_by(Album.created_at.desc()).all()
    return albums


@albums_router.post("/add-photo")
def add_photo_to_album(payload: AddPhotoToAlbumRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    album = db.query(Album).filter(Album.id == payload.album_id, Album.user_id == current_user.id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    photo = db.query(Photo).filter(Photo.id == payload.photo_id, Photo.user_id == current_user.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    if photo not in album.photos:
        album.photos.append(photo)

    if not album.cover_image:
        album.cover_image = photo.image_url

    db.commit()
    return {"added": True}


@albums_router.get("/smart", response_model=SmartAlbumsResponse)
def smart_albums(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    photos = db.query(Photo).filter(Photo.user_id == current_user.id).order_by(Photo.created_at.desc()).all()

    # Smart albums focus on photos uploaded to Cloudinary
    photos = [p for p in photos if p.public_id and "/" in p.public_id]

    albums = []
    groups: Dict[str, List[PhotoOut]] = {name: [] for name in SMART_ALBUMS.keys()}
    
    # 1. Match against predefined SMART_ALBUMS categories
    for name, keywords in SMART_ALBUMS.items():
        matched = []
        for p in photos:
            tags = _parse_tags(p.tags)
            tag_tokens = set()
            for t in tags:
                tag_tokens.update(_tokenize(t))
            caption_tokens = set(_tokenize(p.caption or ""))
            public_id_tokens = set(_tokenize(p.public_id or ""))

            is_match = False
            for kw in keywords:
                kw = (kw or "").strip().lower()
                if not kw: continue
                variants = {kw, f"{kw}s"}
                if (any(v in tag_tokens for v in variants) or 
                    any(v in caption_tokens for v in variants) or 
                    any(v in public_id_tokens for v in variants)):
                    is_match = True
                    break
            if is_match:
                matched.append(_photo_to_out(p))

        groups[name] = matched
        if matched:
            albums.append({
                "name": name,
                "cover_image": matched[0].image_url,
                "photo_count": len(matched),
                "photos": matched[:100],
            })

    # 2. Dynamic clustering by frequent keywords in AI Captions
    # This creates albums like "Beach Photos", "City Life", etc., based on common descriptions.
    caption_words: Dict[str, List[Photo]] = defaultdict(list)
    stop_words = {"a", "the", "in", "on", "at", "to", "for", "with", "and", "is", "of", "photo"}
    
    for p in photos:
        # Extract meaningful nouns from captions (e.g. "A photo of a dog in a park")
        tokens = [t for t in _tokenize(p.caption) if len(t) > 3 and t not in stop_words]
        for token in set(tokens): # uniquely per photo
            caption_words[token].append(p)
            
    # Keep only clusters with at least 3 photos
    for word, cluster_photos in caption_words.items():
        if len(cluster_photos) >= 3:
            album_name = f"{word.capitalize()} Moments"
            # Avoid duplicating predefined albums
            if any(a["name"].lower() == album_name.lower() or a["name"].lower() == word.lower() for a in albums):
                continue
                
            matched_out = [_photo_to_out(p) for p in cluster_photos]
            albums.append({
                "name": album_name,
                "cover_image": matched_out[0].image_url,
                "photo_count": len(matched_out),
                "photos": matched_out[:100],
            })
            # Also add to groups for specific frontend filters
            groups[album_name] = matched_out

    return {"albums": albums, "groups": groups}


@albums_router.get("/{album_id}", response_model=AlbumWithPhotos)
def get_album(album_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    album = db.query(Album).filter(Album.id == album_id, Album.user_id == current_user.id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    photos = [_photo_to_out(p) for p in album.photos]
    return AlbumWithPhotos(
        id=album.id,
        name=album.name,
        cover_image=album.cover_image,
        created_at=album.created_at,
        photos=photos,
    )
