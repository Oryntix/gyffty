"""Shared Redis connection, with a graceful in-process fallback.

Rate limiting and token revocation both want Redis, but neither should stop the
API from booting when it is absent (local development, a single-node deploy, or
Redis briefly down). Callers get a working object either way; `is_distributed`
tells them whether the guarantee actually spans processes.
"""

from __future__ import annotations

import threading
import time
from typing import Protocol

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


class KeyValueStore(Protocol):
    def incr_with_expiry(self, key: str, window_seconds: int) -> int: ...
    def setex(self, key: str, seconds: int, value: str) -> None: ...
    def exists(self, key: str) -> bool: ...
    @property
    def is_distributed(self) -> bool: ...


class InMemoryStore:
    """Process-local fallback. Correct for one worker, approximate across many."""

    def __init__(self) -> None:
        self._counters: dict[str, tuple[int, float]] = {}
        self._values: dict[str, float] = {}
        self._lock = threading.Lock()

    @property
    def is_distributed(self) -> bool:
        return False

    def _purge(self, now: float) -> None:
        for key, expires in list(self._values.items()):
            if expires <= now:
                self._values.pop(key, None)
        for key, (_, expires) in list(self._counters.items()):
            if expires <= now:
                self._counters.pop(key, None)

    def incr_with_expiry(self, key: str, window_seconds: int) -> int:
        now = time.time()
        with self._lock:
            self._purge(now)
            count, expires = self._counters.get(key, (0, now + window_seconds))
            if expires <= now:
                count, expires = 0, now + window_seconds
            count += 1
            self._counters[key] = (count, expires)
            return count

    def setex(self, key: str, seconds: int, value: str) -> None:
        with self._lock:
            self._values[key] = time.time() + seconds

    def exists(self, key: str) -> bool:
        now = time.time()
        with self._lock:
            expires = self._values.get(key)
            if expires is None:
                return False
            if expires <= now:
                self._values.pop(key, None)
                return False
            return True


class RedisStore:
    def __init__(self, url: str) -> None:
        import redis

        self._client = redis.Redis.from_url(
            url, decode_responses=True, socket_connect_timeout=2, socket_timeout=2
        )
        self._client.ping()

    @property
    def is_distributed(self) -> bool:
        return True

    def incr_with_expiry(self, key: str, window_seconds: int) -> int:
        pipe = self._client.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds, nx=True)
        count, _ = pipe.execute()
        return int(count)

    def setex(self, key: str, seconds: int, value: str) -> None:
        self._client.setex(key, seconds, value)

    def exists(self, key: str) -> bool:
        return bool(self._client.exists(key))


_store: KeyValueStore | None = None
_store_lock = threading.Lock()


def get_store() -> KeyValueStore:
    global _store
    if _store is not None:
        return _store
    with _store_lock:
        if _store is not None:
            return _store
        if settings.REDIS_URL:
            try:
                _store = RedisStore(settings.REDIS_URL)
                log.info("redis.connected", url=_redact(settings.REDIS_URL))
                return _store
            except Exception as exc:  # noqa: BLE001 - never block startup on Redis
                log.warning("redis.unavailable", error=str(exc), fallback="in-memory")
        _store = InMemoryStore()
        return _store


def reset_store() -> None:
    """Test hook: drop the cached client so settings changes take effect."""
    global _store
    with _store_lock:
        _store = None


def _redact(url: str) -> str:
    if "@" not in url:
        return url
    scheme, _, rest = url.partition("://")
    return f"{scheme}://***@{rest.rpartition('@')[2]}"
