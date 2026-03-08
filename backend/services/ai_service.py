from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from config.settings import settings

try:
    from groq import Groq
except Exception:  # pragma: no cover
    Groq = None  # type: ignore


DEFAULT_MODEL = "llama-3.1-8b-instant"


def _client() -> Optional[Any]:
    if not settings.GROQ_API_KEY:
        return None
    if Groq is None:
        return None
    return Groq(api_key=settings.GROQ_API_KEY)


def _safe_json_loads(text: str) -> Any:
    # Try to extract the first JSON object/array from the response.
    match = re.search(r"(\{.*\}|\[.*\])", text, flags=re.DOTALL)
    if match:
        text = match.group(1)
    return json.loads(text)


def analyze_upload_context(*, filename: str, latitude: float | None, longitude: float | None) -> Dict[str, Any]:
    """Groq-backed (text-only) analysis that returns tags/caption/emotion/quality.

    Note: Groq models are typically text-only; this uses filename + metadata context.
    """

    client = _client()
    if client is None:
        # Offline fallback
        base_tags = [w for w in re.split(r"[^a-zA-Z0-9]+", filename.lower()) if w]
        base_tags = [t for t in base_tags if t not in {"jpg", "jpeg", "png", "heic", "webp"}]
        tags = (base_tags[:5] or ["photo"])[:5]
        return {
            "tags": tags,
            "caption": "A personal photo",
            "emotion": "calm",
            "quality_score": 75,
        }

    location_hint = "unknown"
    if latitude is not None and longitude is not None:
        location_hint = f"lat={latitude:.6f}, lon={longitude:.6f}"

    system = "You are an assistant that outputs ONLY strict JSON."
    user = (
        "Generate photo metadata for a personal photo organizer.\n"
        f"Filename: {filename}\n"
        f"Location hint: {location_hint}\n\n"
        "Return JSON with keys: tags (array of 3-8 short lowercase words), caption (string), emotion (one of: happy, celebration, calm, nature, family, travel, friends, food, pets, events), quality_score (integer 1-100)."
    )

    res = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.4,
        max_tokens=300,
    )

    content = res.choices[0].message.content if res and res.choices else "{}"
    try:
        data = _safe_json_loads(content)
    except Exception:
        data = {}

    tags = data.get("tags") if isinstance(data, dict) else None
    if not isinstance(tags, list):
        tags = []
    tags = [str(t).strip().lower() for t in tags if str(t).strip()]

    caption = data.get("caption") if isinstance(data, dict) else None
    emotion = data.get("emotion") if isinstance(data, dict) else None
    quality_score = data.get("quality_score") if isinstance(data, dict) else None

    try:
        quality_score = int(quality_score)
    except Exception:
        quality_score = 70
    quality_score = max(1, min(100, quality_score))

    return {
        "tags": tags[:12] or ["photo"],
        "caption": str(caption).strip() if caption else None,
        "emotion": str(emotion).strip().lower() if emotion else None,
        "quality_score": quality_score,
    }


def extract_keywords(query: str) -> List[str]:
    client = _client()
    if client is None:
        words = [w for w in re.split(r"[^a-zA-Z0-9]+", query.lower()) if w]
        stop = {"a", "an", "the", "in", "on", "at", "with", "and", "or", "to", "of", "my", "me"}
        return [w for w in words if w not in stop][:10]

    system = "You extract keywords and output ONLY strict JSON."
    user = (
        "Extract 3-10 short lowercase keyword tags for a photo search query.\n"
        f"Query: {query}\n\n"
        "Return JSON array of strings." 
    )

    res = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
        max_tokens=120,
    )

    content = res.choices[0].message.content if res and res.choices else "[]"
    try:
        data = _safe_json_loads(content)
    except Exception:
        data = []

    if isinstance(data, list):
        keywords = [str(x).strip().lower() for x in data if str(x).strip()]
        return keywords[:12]

    return extract_keywords(query)


def generate_story(*, photo_summaries: List[Dict[str, Any]], prompt: str | None = None) -> str:
    client = _client()
    if client is None:
        return "A short story about your memories, captured in these photos."

    system = "You are a creative assistant."
    user = {
        "instruction": "Write a short, warm story (2-6 sentences) describing a memory from these photos.",
        "prompt": prompt,
        "photos": photo_summaries,
    }

    res = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user)},
        ],
        temperature=0.7,
        max_tokens=400,
    )

    return (res.choices[0].message.content or "").strip() if res and res.choices else ""
