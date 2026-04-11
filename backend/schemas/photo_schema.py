from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class PhotoOut(BaseModel):
    id: int
    image_url: str
    public_id: str
    caption: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    emotion: Optional[str] = None
    quality_score: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PhotoUploadResponse(BaseModel):
    photo_id: int
    image_url: str
    public_id: str
    tags: List[str]
    caption: str | None
    quality_score: int | None


class DuplicateGroup(BaseModel):
    group_id: str
    photos: List[PhotoOut]
    similarity: float
    potential_savings_bytes: int


class DuplicateResponse(BaseModel):
    groups: List[DuplicateGroup]
    total_groups: int
    potential_savings_bytes: int


class MapPoint(BaseModel):
    photo_id: int
    image_url: str
    latitude: float
    longitude: float


class TimelineEvent(BaseModel):
    title: str
    month: str
    photo_count: int
    cover_image: str | None = None
    photo_ids: List[int]


class TimelineYear(BaseModel):
    year: int
    events: List[TimelineEvent]


class TimelineResponse(BaseModel):
    years: List[TimelineYear]


class TagCloudItem(BaseModel):
    name: str
    frequency: int


class TagCloudResponse(BaseModel):
    tags: List[TagCloudItem]


class BestPhotosResponse(BaseModel):
    photos: List[PhotoOut]


class DeletePhotoResponse(BaseModel):
    deleted: bool
    photo_id: int
    cloudinary_deleted: bool
    detail: str | None = None


class ErrorResponse(BaseModel):
    detail: str
    extra: Any | None = None
