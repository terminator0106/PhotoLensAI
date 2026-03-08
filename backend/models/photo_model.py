from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from config.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    image_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    public_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str] = mapped_column(Text, default="[]", nullable=False)  # JSON array as string
    emotion: Mapped[str | None] = mapped_column(String(120), nullable=True)
    quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    phash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="photos")
    albums = relationship("Album", secondary="photo_albums", back_populates="photos")
