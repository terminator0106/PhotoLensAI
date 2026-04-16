from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import httpx

from config.settings import settings


GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_CHAT_COMPLETIONS_URL = f"{GROQ_BASE_URL}/chat/completions"
GROQ_MODELS_URL = f"{GROQ_BASE_URL}/models"

# Model availability on Groq can change over time.
DEFAULT_MODEL = "mixtral-8x7b-32768"


def _auth_headers() -> dict[str, str]:
    if not settings.GROQ_API_KEY:
        return {}
    return {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _safe_text(v: Any) -> str:
    return str(v or "").strip()


def _extract_chat_content(data: Any) -> str:
    if not isinstance(data, dict):
        return ""

    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""

    first = choices[0]
    if not isinstance(first, dict):
        return ""

    msg = first.get("message")
    if not isinstance(msg, dict):
        return ""

    return _safe_text(msg.get("content"))


def _strip_think_blocks(text: str) -> str:
    if not text:
        return ""
    # Remove explicit think blocks if present.
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.IGNORECASE | re.DOTALL)
    cleaned = cleaned.replace("<think>", "").replace("</think>", "")
    return cleaned.strip()


async def generate_story_groq(
    *,
    captions: List[str],
    prompt: Optional[str] = None,
    model: str = DEFAULT_MODEL,
) -> str:
    """Generate a short emotional story using Groq."""

    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not set")

    captions_clean = [c.strip() for c in captions if c and str(c).strip()]
    captions_clean = captions_clean[:30]

    base_prompt = (
        "Create a short emotional story from these moments. "
        "Write 1-3 paragraphs, vivid but grounded, no bullet points.\n\n"
        f"Moments: {captions_clean}"
    )
    if prompt and prompt.strip():
        base_prompt = f"{prompt.strip()}\n\n{base_prompt}"

    headers = _auth_headers()

    async def _post_story(client: httpx.AsyncClient, *, model_id: str) -> str:
        payload: Dict[str, Any] = {
            "model": model_id,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a helpful creative writing assistant. "
                        "Return ONLY the story text. "
                        "Do not include analysis, planning, or <think> blocks."
                    ),
                },
                {"role": "user", "content": base_prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 500,
        }

        res = await client.post(GROQ_CHAT_COMPLETIONS_URL, headers=headers, json=payload)
        res.raise_for_status()
        raw = _extract_chat_content(res.json())
        if not raw:
            raise RuntimeError("Groq returned an unexpected response")

        # Some models may return reasoning output; reject or strip it.
        low = raw.lower()
        if "<think>" in low and "</think>" not in low:
            raise RuntimeError("Groq model returned reasoning output")

        content = _strip_think_blocks(raw)
        if not content:
            raise RuntimeError("Groq returned an empty response")
        return content

    async def _list_models(client: httpx.AsyncClient) -> List[str]:
        res = await client.get(GROQ_MODELS_URL, headers=headers)
        res.raise_for_status()
        data = res.json()
        if not isinstance(data, dict):
            return []
        items = data.get("data")
        if not isinstance(items, list):
            return []
        out: List[str] = []
        for it in items:
            if isinstance(it, dict) and it.get("id"):
                out.append(str(it["id"]))
        return out

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            return await _post_story(client, model_id=model)
        except httpx.HTTPStatusError as e:
            status = e.response.status_code if e.response is not None else None
            # Most common failure observed is a rejected/unknown model id.
            if status not in {400, 404}:
                raise

            try:
                available = await _list_models(client)
            except Exception:
                raise

            preferred_exact = [
                # Prefer common chat-capable Groq models.
                "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
                "meta-llama/llama-4-scout-17b-16e-instruct",
                "moonshotai/kimi-k2-instruct",
            ]

            candidates: List[str] = [m for m in preferred_exact if m in available]

            preferred_prefixes = ("llama", "meta-llama", "mixtral", "gemma")
            for m in available:
                if m in candidates:
                    continue
                if m.lower().startswith(preferred_prefixes):
                    candidates.append(m)

            if not candidates:
                candidates = available

            seen = {model}
            for candidate in candidates:
                if candidate in seen:
                    continue
                seen.add(candidate)
                try:
                    return await _post_story(client, model_id=candidate)
                except Exception:
                    # Try a few before giving up; keep it bounded.
                    if len(seen) >= 6:
                        break
                    continue
            raise
