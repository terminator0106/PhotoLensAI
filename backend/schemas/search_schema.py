from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

from schemas.photo_schema import PhotoOut


class PhotoSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)


class PhotoSearchResponse(BaseModel):
    keywords: List[str]
    photos: List[PhotoOut]
