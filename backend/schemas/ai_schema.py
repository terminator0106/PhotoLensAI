from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class EnhanceImageRequest(BaseModel):
    image_url: str


class EnhanceImageResponse(BaseModel):
    enhanced_image_url: Optional[str] = None
    status: str = Field(default="done")  # processing/done
    prediction_id: Optional[str] = None


class StoryPhotoInput(BaseModel):
    caption: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class GenerateStoryRequest(BaseModel):
    # Legacy input (frontend)
    photo_ids: Optional[List[int]] = None
    # Spec input (Stage 7)
    photos: Optional[List[StoryPhotoInput]] = None
    prompt: Optional[str] = None

    def model_post_init(self, __context):
        if not self.photo_ids and not self.photos:
            raise ValueError("Provide either photo_ids or photos")


class GenerateStoryResponse(BaseModel):
    story: str


class AIInsightsResponse(BaseModel):
    total_photos: int
    total_tags: int
    most_common_tags: List[str] = Field(default_factory=list)
    duplicate_photos: int
    best_photos: int
    mood_distribution: Dict[str, float]
