from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.database import Base, engine
from config.settings import settings
import models  # noqa: F401
from routes.ai_routes import ai_router
from routes.album_routes import albums_router
from routes.auth_routes import auth_router
from routes.photo_routes import memories_router, photos_router, tags_router
from routes.search_routes import search_router
from services.cloudinary_service import ensure_cloudinary_configured


app = FastAPI(title="PrivateLens – Offline AI Photo Organizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"] ,
)


@app.on_event("startup")
def on_startup():
    ensure_cloudinary_configured()
    Base.metadata.create_all(bind=engine)


app.include_router(auth_router)
app.include_router(photos_router)
app.include_router(albums_router)
app.include_router(ai_router)
app.include_router(search_router)
app.include_router(memories_router)
app.include_router(tags_router)
