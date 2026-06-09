from __future__ import annotations

import json
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Resolve backend/.env regardless of current working directory
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    ENV: str = Field(default="dev")

    DATABASE_URL: str = Field(default="sqlite:///./privatelens.db")

    SECRET_KEY: str = Field(default="CHANGE_ME")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 24 * 7)  # 7 days

    COOKIE_NAME: str = Field(default="privatelens_token")
    COOKIE_SECURE: bool = Field(default=False)
    COOKIE_SAMESITE: str = Field(default="lax")

    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None

    HUGGINGFACE_API_KEY: str | None = None

    # Gemini (Image enhancement)
    GEMINI_API_KEY: str | None = None
    # Model name can change over time; keep it configurable.
    GEMINI_IMAGE_MODEL: str = Field(default="gemini-2.5-flash-image")
    GEMINI_IMAGE_ENHANCE_PROMPT: str | None = None

    # If true, use Vertex AI (billed quota) instead of API key.
    # Requires Google Cloud project + ADC credentials.
    GEMINI_USE_VERTEXAI: bool = Field(default=False)
    GOOGLE_CLOUD_PROJECT: str | None = None
    GOOGLE_CLOUD_LOCATION: str | None = None
    # Optional convenience: point to a service account JSON file.
    GOOGLE_APPLICATION_CREDENTIALS: str | None = None

    # Image enhancement provider
    # - "local": free/offline enhancement (no external API)
    # - "gemini": use Gemini/Vertex (requires quota/billing)
    ENHANCE_PROVIDER: str = Field(default="local")
    LOCAL_ENHANCE_SCALE: int = Field(default=2)

    # Stage 7
    GROQ_API_KEY: str | None = None

    # Keep this as a plain string to avoid pydantic-settings trying to JSON-decode it.
    # Accept either comma-separated values OR a JSON array string.
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        raw = (self.CORS_ORIGINS or "").strip()
        if not raw:
            return []

        if raw.startswith("["):
            try:
                data = json.loads(raw)
                if isinstance(data, list):
                    return [str(x).strip() for x in data if str(x).strip()]
            except Exception:
                pass

        return [item.strip() for item in raw.split(",") if item.strip()]


settings = Settings()
