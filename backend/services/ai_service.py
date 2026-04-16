from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

from huggingface_hub import AsyncInferenceClient

from config.settings import settings


logger = logging.getLogger(__name__)

CAPTION_MODEL = "Salesforce/blip-image-captioning-base"
TAGS_MODEL = "google/vit-base-patch16-224"


def _hf_client(timeout_s: float = 30.0) -> AsyncInferenceClient:
    if not settings.HUGGINGFACE_API_KEY:
        raise RuntimeError("HUGGINGFACE_API_KEY is not set")
    # Use the supported Inference Providers client.
    return AsyncInferenceClient(
        provider="hf-inference",
        api_key=settings.HUGGINGFACE_API_KEY,
        timeout=timeout_s,
    )


async def generate_caption(image_url: str) -> str:
    """Generate a caption from an image URL using BLIP.

    Returns a caption string. Raises on hard failures.
    """
    try:
        client = _hf_client()
        # AsyncInferenceClient supports URL inputs and handles binary downloads.
        data = await client.image_to_text(image_url, model=CAPTION_MODEL)
    except Exception as e:
        # Many HF accounts/tokens cannot access image-to-text via hf-inference,
        # and some models aren't available on this provider. Fall back to
        # a lightweight caption derived from classification labels.
        logger.warning("Hugging Face caption generation failed: %s", e)

        try:
            client = _hf_client(timeout_s=20.0)
            preds = await client.image_classification(image_url, model=TAGS_MODEL, top_k=3)
            if isinstance(preds, list) and preds:
                first = preds[0]
                if isinstance(first, dict) and first.get("label"):
                    label = str(first["label"]).strip()
                else:
                    # huggingface_hub can return typed objects too
                    label = str(getattr(first, "label", "") or "").strip()
                if label:
                    # Keep it simple and consistent.
                    short = label.split(",")[0].strip()
                    if short:
                        return f"A photo of {short.lower()}"
        except Exception as e2:
            logger.warning("Hugging Face caption fallback classification failed: %s", e2)

        return "Unable to analyze image"

    caption: Optional[str] = None
    # Common shapes:
    # - [{"generated_text": "..."}]
    # - {"generated_text": "..."}
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict) and "generated_text" in first:
            caption = str(first.get("generated_text") or "").strip()
    elif isinstance(data, dict) and "generated_text" in data:
        caption = str(data.get("generated_text") or "").strip()

    return caption or "Unable to analyze image"


async def generate_tags(image_url: str, *, top_k: int = 5) -> List[str]:
    """Generate basic tags (labels) from an image URL using ViT classification."""
    try:
        client = _hf_client()
        data = await client.image_classification(
            image_url,
            model=TAGS_MODEL,
            top_k=max(1, min(int(top_k), 10)),
        )
    except Exception as e:
        logger.warning("Hugging Face tag generation failed: %s", e)
        return []

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
