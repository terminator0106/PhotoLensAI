from __future__ import annotations

import json
import random
import sys
from datetime import UTC, datetime
from pathlib import Path

# Allow running this file directly: ensure backend/ is on sys.path
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from config.database import Base, SessionLocal, engine
from models.photo_model import Photo
from models.tag_model import Tag
from models.user_model import User
from utils.auth_utils import hash_password


def _upsert_tag(db, tag_cache: dict[str, Tag], name: str):
    name = (name or "").strip().lower()
    if not name:
        return
    if name in tag_cache:
        tag_cache[name].frequency += 1
        return

    tag = db.query(Tag).filter(Tag.name == name).first()
    if not tag:
        tag = Tag(name=name, frequency=1)
        db.add(tag)
    else:
        tag.frequency += 1
    tag_cache[name] = tag


def main():
    Base.metadata.create_all(bind=engine)

    email = "demo@privatelens.local"
    password = "demo1234"

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(name="Demo User", email=email, password_hash=hash_password(password))
            db.add(user)
            db.commit()
            db.refresh(user)

        # Insert 15 demo photos if the user has none.
        existing = db.query(Photo).filter(Photo.user_id == user.id).count()
        if existing >= 10:
            print(f"Demo user already has {existing} photos; skipping seed.")
            return

        sample_tags = [
            ["family", "smile", "party"],
            ["beach", "sunset", "vacation"],
            ["city", "night", "lights"],
            ["mountain", "hike", "nature"],
            ["pet", "dog", "cute"],
            ["food", "restaurant", "friends"],
            ["birthday", "cake", "celebration"],
            ["travel", "train", "adventure"],
            ["forest", "tree", "green"],
            ["home", "cozy", "calm"],
        ]

        captions = [
            "Laughing together at the party",
            "A peaceful sunset by the sea",
            "City lights on a late night walk",
            "Reaching the peak after a long hike",
            "A playful moment with a furry friend",
            "Sharing a great meal with friends",
            "Birthday wishes and sweet cake",
            "A train ride to somewhere new",
            "Quiet time among tall trees",
            "A calm evening at home",
        ]

        now = datetime.now(UTC)
        to_create = 15
        tag_cache: dict[str, Tag] = {}
        for i in range(to_create):
            t = sample_tags[i % len(sample_tags)]
            cap = captions[i % len(captions)]

            # Spread across years/months
            year = random.choice([2023, 2024, 2025, now.year])
            month = random.randint(1, 12)
            day = random.randint(1, 28)
            created_at = datetime(year, month, day, random.randint(0, 23), random.randint(0, 59), 0)

            # Some photos will have GPS, others not
            if i % 3 == 0:
                latitude = 19.0760 + (i - 7) * 0.003
                longitude = 72.8777 + (7 - i) * 0.003
            else:
                latitude = None
                longitude = None

            image_url = f"https://picsum.photos/seed/privatelens-{i}/1024/768"
            photo = Photo(
                user_id=user.id,
                image_url=image_url,
                public_id=f"demo/privatelens-{i}",
                caption=cap,
                tags=json.dumps([x.lower() for x in t]),
                emotion=random.choice(["happy", "calm", "unknown"]),
                quality_score=random.choice([60, 72, 85, 90]),
                latitude=latitude,
                longitude=longitude,
                bytes=random.randint(250_000, 3_500_000),
                created_at=created_at,
            )
            db.add(photo)
            for tag in t:
                _upsert_tag(db, tag_cache, tag)

        db.commit()
        print("Seeded demo photos.")
        print(f"Demo login: {email} / {password}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
