from __future__ import annotations

from typing import Any, Dict

import cloudinary
import cloudinary.uploader

from config.settings import settings

_configured = False


def ensure_cloudinary_configured() -> None:
    global _configured
    if _configured:
        return

    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        # Allow the API to run without Cloudinary configured; upload endpoints will fail gracefully.
        _configured = True
        return

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    _configured = True


def upload_image(*, file_bytes: bytes, filename: str, folder: str = "privatelens") -> Dict[str, Any]:
    ensure_cloudinary_configured()
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        raise RuntimeError("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET in .env")

    res = cloudinary.uploader.upload(
        file_bytes,
        resource_type="image",
        folder=folder,
        public_id=None,
        use_filename=True,
        unique_filename=True,
        overwrite=False,
        filename_override=filename,
    )
    return res


def delete_image(*, public_id: str) -> bool:
    ensure_cloudinary_configured()
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        return False
    res = cloudinary.uploader.destroy(public_id, resource_type="image")
    return bool(res and res.get("result") == "ok")
