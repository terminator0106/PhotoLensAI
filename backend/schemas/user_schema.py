from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=6, max_length=200)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        email = (v or "").strip().lower()
        # Allow offline/local domains (e.g. demo@privatelens.local) by avoiding
        # strict public-DNS validation.
        if "@" not in email or email.startswith("@") or email.endswith("@"):  # basic sanity
            raise ValueError("Invalid email")
        if any(ch.isspace() for ch in email):
            raise ValueError("Invalid email")
        return email


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        email = (v or "").strip().lower()
        if "@" not in email or email.startswith("@") or email.endswith("@"):  # basic sanity
            raise ValueError("Invalid email")
        if any(ch.isspace() for ch in email):
            raise ValueError("Invalid email")
        return email


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}
