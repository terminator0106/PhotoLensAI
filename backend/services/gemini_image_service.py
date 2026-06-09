from __future__ import annotations

import base64
import mimetypes
import os
from typing import Tuple

import anyio
import httpx

from config.settings import Settings


MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20MB


class GeminiImageError(RuntimeError):
    pass


def _guess_mime_type_from_url(url: str) -> str | None:
    try:
        mime, _ = mimetypes.guess_type(url)
        if mime and mime.startswith("image/"):
            return mime
    except Exception:
        pass
    return None


async def _download_image_bytes(image_url: str) -> Tuple[bytes, str]:
    async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
        res = await client.get(image_url)
        res.raise_for_status()

        content_type = (res.headers.get("content-type") or "").split(";")[0].strip().lower()
        if not content_type.startswith("image/"):
            content_type = _guess_mime_type_from_url(image_url) or "image/jpeg"

        data = res.content
        if not isinstance(data, (bytes, bytearray)):
            raise GeminiImageError("Failed to download image bytes")

        if len(data) > MAX_IMAGE_BYTES:
            raise GeminiImageError("Image is too large (max 20MB)")

        return bytes(data), content_type


def _extract_inline_image_bytes(response) -> Tuple[bytes, str]:
    # google-genai response: candidates[].content.parts[].inline_data (Blob)
    candidates = getattr(response, "candidates", None) or []
    for cand in candidates:
        content = getattr(cand, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            inline = getattr(part, "inline_data", None)
            if not inline:
                continue
            data = getattr(inline, "data", None)
            if not data:
                continue

            mime_type = (getattr(inline, "mime_type", None) or "image/png").split(";")[0].strip().lower()
            if isinstance(data, str):
                try:
                    return base64.b64decode(data), mime_type
                except Exception as e:
                    raise GeminiImageError("Failed to decode Gemini image data") from e

            if isinstance(data, (bytes, bytearray)):
                return bytes(data), mime_type

    raise GeminiImageError("Gemini did not return an image")


def _make_data_url(image_bytes: bytes, mime_type: str) -> str:
    b64 = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime_type};base64,{b64}"


def _enhance_with_gemini_sync(image_bytes: bytes, mime_type: str) -> Tuple[bytes, str]:
    runtime_settings = Settings()
    if runtime_settings.GEMINI_USE_VERTEXAI:
        if runtime_settings.GOOGLE_APPLICATION_CREDENTIALS:
            os.environ.setdefault(
                "GOOGLE_APPLICATION_CREDENTIALS",
                runtime_settings.GOOGLE_APPLICATION_CREDENTIALS,
            )
        if not runtime_settings.GOOGLE_CLOUD_PROJECT or not runtime_settings.GOOGLE_CLOUD_LOCATION:
            raise GeminiImageError(
                "Vertex AI mode is enabled but GOOGLE_CLOUD_PROJECT/GOOGLE_CLOUD_LOCATION are not configured"
            )
    else:
        if not runtime_settings.GEMINI_API_KEY:
            raise GeminiImageError("GEMINI_API_KEY is not configured")

    try:
        from google import genai
        from google.genai import types
    except Exception as e:
        raise GeminiImageError("Gemini SDK is not installed (missing google-genai)") from e

    model = (runtime_settings.GEMINI_IMAGE_MODEL or "").strip() or "gemini-2.5-flash-image-preview"
    prompt = (runtime_settings.GEMINI_IMAGE_ENHANCE_PROMPT or "").strip() or (
        "Enhance and upscale this photo. Keep the same composition and identity, "
        "improve sharpness and clarity, reduce noise, correct color/contrast naturally. "
        "Return ONLY the enhanced image."
    )

    if runtime_settings.GEMINI_USE_VERTEXAI:
        client = genai.Client(
            vertexai=True,
            project=runtime_settings.GOOGLE_CLOUD_PROJECT,
            location=runtime_settings.GOOGLE_CLOUD_LOCATION,
        )
    else:
        client = genai.Client(api_key=runtime_settings.GEMINI_API_KEY)

    try:
        response = client.models.generate_content(
            model=model,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt),
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                temperature=0.2,
            ),
        )
    except Exception as e:
        msg = str(e) or "Gemini request failed"
        upper = msg.upper()
        if "RESOURCE_EXHAUSTED" in upper or "429" in upper:
            raise GeminiImageError(
                "Gemini quota exhausted (429). If you're using an API key, enable billing/quotas or switch to Vertex AI mode."
            ) from e
        if "NOT_FOUND" in upper or "MODEL" in upper and "NOT" in upper and "FOUND" in upper:
            raise GeminiImageError(
                "Gemini model not available for this key/project. Run model listing and set GEMINI_IMAGE_MODEL accordingly."
            ) from e
        raise

    return _extract_inline_image_bytes(response)


async def enhance_image_to_data_url(image_url: str) -> str:
    image_bytes, mime_type = await _download_image_bytes(image_url)
    out_bytes, out_mime = await anyio.to_thread.run_sync(
        _enhance_with_gemini_sync,
        image_bytes,
        mime_type,
    )
    return _make_data_url(out_bytes, out_mime)
