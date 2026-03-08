from __future__ import annotations

import json
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


SMART_ALBUMS: Dict[str, List[str]] = {
    "Pets": ["dog", "cat", "pet", "puppy", "kitten"],
    "Food": ["food", "meal", "dessert", "coffee", "restaurant"],
    "Travel": ["travel", "trip", "beach", "mountain", "hotel", "flight"],
    "Nature": ["nature", "sunset", "forest", "sea", "sky", "flowers"],
    "Events": ["event", "wedding", "birthday", "party", "celebration"],
    "Happy Moments": ["happy", "friends", "family", "smile", "fun"],
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

    albums = []
    for name, keywords in SMART_ALBUMS.items():
        matched = []
        for p in photos:
            tags = _parse_tags(p.tags)
            if any(k in tags for k in keywords):
                matched.append(_photo_to_out(p))

        if matched:
            albums.append(
                {
                    "name": name,
                    "cover_image": matched[0].image_url,
                    "photo_count": len(matched),
                    "photos": matched[:100],
                }
            )

    return {"albums": albums}


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
