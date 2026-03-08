from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from schemas.photo_schema import PhotoOut


class AlbumCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    cover_image: Optional[str] = None


class AddPhotoToAlbumRequest(BaseModel):
    album_id: int
    photo_id: int


class AlbumOut(BaseModel):
    id: int
    name: str
    cover_image: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlbumWithPhotos(AlbumOut):
    photos: List[PhotoOut] = Field(default_factory=list)


class SmartAlbum(BaseModel):
    name: str
    cover_image: Optional[str] = None
    photo_count: int
    photos: List[PhotoOut]


class SmartAlbumsResponse(BaseModel):
    albums: List[SmartAlbum]
