"""ASGI entrypoint shim.

This repo's FastAPI instance lives in `main.py` as `app`.
Some commands/tools expect a module named `app`.

Usage:
  uvicorn app:main --reload
"""

from __future__ import annotations

from main import app as main
