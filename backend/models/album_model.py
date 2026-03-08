from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from config.database import Base


PhotoAlbum = Table(
    "photo_albums",
    Base.metadata,
    Column("photo_id", ForeignKey("photos.id", ondelete="CASCADE"), primary_key=True),
    Column("album_id", ForeignKey("albums.id", ondelete="CASCADE"), primary_key=True),
)


class Album(Base):
    __tablename__ = "albums"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_album_user_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    cover_image: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="albums")
    photos = relationship("Photo", secondary=PhotoAlbum, back_populates="albums")
