from __future__ import annotations

import base64
from io import BytesIO
from typing import Tuple

import httpx
from PIL import Image, ImageEnhance, ImageFilter

from config.settings import settings


MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20MB


class LocalEnhanceError(RuntimeError):
    pass


async def _download_image_bytes(image_url: str) -> Tuple[bytes, str]:
    async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
        res = await client.get(image_url)
        res.raise_for_status()

        content_type = (res.headers.get("content-type") or "").split(";")[0].strip().lower()
        data = res.content
        if not isinstance(data, (bytes, bytearray)):
            raise LocalEnhanceError("Failed to download image")
        if len(data) > MAX_IMAGE_BYTES:
            raise LocalEnhanceError("Image is too large (max 20MB)")

        return bytes(data), (content_type if content_type.startswith("image/") else "image/jpeg")


def _make_data_url(image_bytes: bytes, mime_type: str) -> str:
    b64 = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime_type};base64,{b64}"


def _enhance_pil(image_bytes: bytes, *, scale: int) -> bytes:
    if scale < 1 or scale > 4:
        raise LocalEnhanceError("LOCAL_ENHANCE_SCALE must be between 1 and 4")

    try:
        img = Image.open(BytesIO(image_bytes))
    except Exception as e:
        raise LocalEnhanceError("Unsupported image") from e

    # Normalize mode
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Limit maximum dimensions to avoid Cloudinary file size limits (10MB)
    # 4000px is usually enough for high quality while staying under 10MB in JPEG
    MAX_DIM = 3500
    w, h = img.size
    if max(w * scale, h * scale) > MAX_DIM:
        ratio = MAX_DIM / max(w * scale, h * scale)
        target_w = int(w * scale * ratio)
        target_h = int(h * scale * ratio)
    else:
        target_w = w * scale
        target_h = h * scale

    # Upscale with high-quality resampling
    if target_w != w or target_h != h:
        img = img.resize((target_w, target_h), resample=Image.Resampling.LANCZOS)

    # 1. Contrast & Color - Subtle boost
    img = ImageEnhance.Contrast(img).enhance(1.1)
    img = ImageEnhance.Color(img).enhance(1.1)
    
    # 2. Sharpening - Reduce radius to avoid "halo" blurriness, increase percent for detail
    img = img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=150, threshold=2))
    
    # 3. Brightness - Slight boost for "pop"
    img = ImageEnhance.Brightness(img).enhance(1.02)

    out = BytesIO()
    # SAVE AS JPEG instead of PNG to drastically reduce file size (prevents Cloudinary 10MB error)
    # Quality 85 is the sweet spot for file size vs quality
    img.save(out, format="JPEG", quality=85, optimize=True, progressive=True)
    return out.getvalue()


async def enhance_image_to_data_url(image_url: str) -> str:
    image_bytes, _ = await _download_image_bytes(image_url)
    scale = int(getattr(settings, "LOCAL_ENHANCE_SCALE", 2) or 2)
    out_bytes = _enhance_pil(image_bytes, scale=scale)
    return _make_data_url(out_bytes, "image/jpeg")
