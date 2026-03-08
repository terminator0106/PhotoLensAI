from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class GenerateStoryRequest(BaseModel):
    photo_ids: List[int] = Field(min_length=1)
    prompt: Optional[str] = None


class GenerateStoryResponse(BaseModel):
    story: str


class AIInsightsResponse(BaseModel):
    total_photos: int
    total_tags: int
    duplicate_photos: int
    best_photos: int
    mood_distribution: Dict[str, float]
