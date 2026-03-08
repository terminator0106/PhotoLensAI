from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import Cookie, Depends, HTTPException, Request
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from config.settings import settings
from config.database import get_db
from models.user_model import User

def _normalize_password_for_bcrypt(password: str) -> bytes:
    """bcrypt only considers the first 72 bytes of the password.

    To safely support longer passphrases, we pre-hash with SHA-256 (deterministic)
    and feed the hex digest to bcrypt.
    """

    raw = password.encode("utf-8")
    if len(raw) <= 72:
        return raw
    return hashlib.sha256(raw).hexdigest().encode("utf-8")


def hash_password(password: str) -> str:
    pw = _normalize_password_for_bcrypt(password)
    hashed = bcrypt.hashpw(pw, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        pw = _normalize_password_for_bcrypt(password)
        return bcrypt.checkpw(pw, password_hash.encode("utf-8"))
    except Exception:
        return False


def create_access_token(*, subject: str, expires_delta: Optional[timedelta] = None, extra: dict[str, Any] | None = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta
    payload: dict[str, Any] = {"sub": subject, "exp": expire}
    if extra:
        payload.update(extra)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def _get_token_from_request(request: Request, cookie_token: str | None) -> str | None:
    if cookie_token:
        return cookie_token
    auth = request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    cookie_token: str | None = Cookie(default=None, alias=settings.COOKIE_NAME),
) -> User:
    token = _get_token_from_request(request, cookie_token)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
