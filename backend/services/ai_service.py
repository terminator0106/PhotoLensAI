from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import httpx

from config.settings import settings


HF_BASE_URL = "https://api-inference.huggingface.co/models/"
CAPTION_MODEL = "Salesforce/blip-image-captioning-base"
TAGS_MODEL = "google/vit-base-patch16-224"


def _auth_headers() -> dict[str, str]:
    if not settings.HUGGINGFACE_API_KEY:
        return {}
    return {"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"}


async def _hf_post_json(*, model: str, payload: dict[str, Any], timeout_s: float = 30.0) -> Any:
    url = f"{HF_BASE_URL}{model}"
    headers = {
        **_auth_headers(),
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=timeout_s) as client:
        res = await client.post(url, headers=headers, json=payload)

    # Hugging Face often returns 503 while loading the model.
    if res.status_code in {503, 504}:
        raise RuntimeError(f"Hugging Face model loading/unavailable ({res.status_code})")

    res.raise_for_status()
    return res.json()


async def generate_caption(image_url: str) -> str:
    """Generate a caption from an image URL using BLIP.

    Returns a caption string. Raises on hard failures.
    """
    data = await _hf_post_json(model=CAPTION_MODEL, payload={"inputs": image_url})

    # Expected formats:
    # - [{"generated_text": "..."}]
    # - {"generated_text": "..."}
    caption: Optional[str] = None
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict) and "generated_text" in first:
            caption = str(first.get("generated_text") or "").strip()
    elif isinstance(data, dict):
        if "generated_text" in data:
            caption = str(data.get("generated_text") or "").strip()

    return caption or "Unable to analyze image"


async def generate_tags(image_url: str, *, top_k: int = 5) -> List[str]:
    """Generate basic tags (labels) from an image URL using ViT classification."""
    data = await _hf_post_json(model=TAGS_MODEL, payload={"inputs": image_url})

    # Expected format: [{"label": "...", "score": 0.9}, ...]
    labels: List[str] = []
    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            label = item.get("label")
            if not label:
                continue
            labels.append(str(label).strip().lower())

    # de-dup while preserving order
    seen = set()
    unique: List[str] = []
    for l in labels:
        if not l or l in seen:
            continue
        seen.add(l)
        unique.append(l)
        if len(unique) >= max(1, min(int(top_k), 10)):
            break

    return unique


def extract_keywords(query: str) -> List[str]:
    """Lightweight keyword extraction for search without any external AI."""
    words = [w for w in re.split(r"[^a-zA-Z0-9]+", (query or "").lower()) if w]
    stop = {"a", "an", "the", "in", "on", "at", "with", "and", "or", "to", "of", "my", "me", "for", "is"}
    keywords = [w for w in words if w not in stop]
    # de-dup preserving order
    seen = set()
    out: List[str] = []
    for w in keywords:
        if w in seen:
            continue
        seen.add(w)
        out.append(w)
        if len(out) >= 12:
            break
    return out


def generate_story(*, photo_summaries: List[Dict[str, Any]], prompt: str | None = None) -> str:
    """Offline story generator (no external LLM). Keeps existing endpoint functional."""
    if not photo_summaries:
        return "A short story about your memories."

    captions = [str(p.get("caption") or "").strip() for p in photo_summaries]
    captions = [c for c in captions if c]

    tags: List[str] = []
    for p in photo_summaries:
        t = p.get("tags")
        if isinstance(t, list):
            tags.extend([str(x).strip().lower() for x in t if str(x).strip()])

    # pick a few representative tags
    seen = set()
    top_tags: List[str] = []
    for t in tags:
        if t in seen:
            continue
        seen.add(t)
        top_tags.append(t)
        if len(top_tags) >= 5:
            break

    base = "These photos capture a quiet moment in time."
    if captions:
        base = captions[0]

    if prompt and prompt.strip():
        return f"{prompt.strip()} {base}"

    if top_tags:
        return f"{base} Themes: {', '.join(top_tags[:5])}."

    return base
