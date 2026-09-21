"""Password hashing and JWT issuing, verification and revocation."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.redis_client import get_store

_pwd_context = CryptContext(
    schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=settings.BCRYPT_ROUNDS
)

ACCESS_TOKEN = "access"
REFRESH_TOKEN = "refresh"

# bcrypt silently truncates beyond 72 bytes, which would make two different long
# passwords equivalent. Reject rather than truncate.
MAX_PASSWORD_BYTES = 72


def hash_password(raw: str) -> str:
    if len(raw.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError("Password must be at most 72 bytes.")
    return _pwd_context.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    if len(raw.encode("utf-8")) > MAX_PASSWORD_BYTES:
        return False
    try:
        return _pwd_context.verify(raw, hashed)
    except ValueError:
        # Malformed hash in the database: treat as a failed login, not a 500.
        return False


def _create_token(subject: str, token_type: str, expires: timedelta) -> tuple[str, str]:
    now = datetime.now(UTC)
    jti = secrets.token_urlsafe(16)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "jti": jti,
        "iat": now,
        "nbf": now,
        "exp": now + expires,
        "iss": settings.PROJECT_NAME,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM), jti


def create_access_token(subject: str) -> str:
    token, _ = _create_token(
        subject, ACCESS_TOKEN, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return token


def create_refresh_token(subject: str) -> str:
    token, _ = _create_token(
        subject, REFRESH_TOKEN, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    return token


def decode_token(token: str, expected_type: str = ACCESS_TOKEN) -> dict[str, Any] | None:
    """Return the claims, or None when invalid, wrong-typed, or revoked."""
    try:
        claims = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            issuer=settings.PROJECT_NAME,
            options={"require_exp": True, "require_sub": True},
        )
    except JWTError:
        return None

    if claims.get("type") != expected_type:
        return None

    jti = claims.get("jti")
    if jti and is_revoked(jti):
        return None
    return claims


def revoke_token(claims: dict[str, Any]) -> None:
    """Blocklist a token's jti until its own expiry, so logout is immediate.

    Only the remaining lifetime is stored, so the blocklist stays small and
    self-cleaning.
    """
    jti = claims.get("jti")
    exp = claims.get("exp")
    if not jti or not exp:
        return
    ttl = int(exp - datetime.now(UTC).timestamp())
    if ttl > 0:
        get_store().setex(f"revoked:{jti}", ttl, "1")


def is_revoked(jti: str) -> bool:
    return get_store().exists(f"revoked:{jti}")
