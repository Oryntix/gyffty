"""A small in-process TTL cache for catalogue reads.

The database is remote — roughly 150ms per round trip — so the cheapest query
is the one never sent. Categories, facets and homepage rails change at
merchandising pace, not per request, and are identical for every visitor.

This is per-process, so N workers hold N copies. That is fine for read-only
catalogue data: the worst case is a worker serving content up to TTL seconds
stale. Anything that must be globally consistent (carts, stock, orders) is
never cached here.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Callable
from typing import Any, TypeVar

T = TypeVar("T")

_store: dict[str, tuple[float, Any]] = {}
_lock = threading.Lock()

DEFAULT_TTL_SECONDS = 120
# Listing pages are keyed by their filters, so the key space is large. Cap the
# cache and evict the oldest entries rather than letting it grow unbounded.
MAX_ENTRIES = 500


def get_or_set(key: str, factory: Callable[[], T], ttl: int = DEFAULT_TTL_SECONDS) -> T:
    """Return the cached value, or compute and store it.

    The factory runs outside the lock: holding it across a 150ms database call
    would serialise every request behind the first one, which is the opposite
    of the point.
    """
    now = time.monotonic()

    with _lock:
        hit = _store.get(key)
        if hit is not None and hit[0] > now:
            return hit[1]

    value = factory()

    with _lock:
        if len(_store) >= MAX_ENTRIES:
            # Drop whatever expires soonest; cheap and good enough here.
            for stale in sorted(_store, key=lambda k: _store[k][0])[: MAX_ENTRIES // 4]:
                _store.pop(stale, None)
        _store[key] = (now + ttl, value)
    return value


def invalidate(prefix: str = "") -> int:
    """Drop cached entries. Called whenever the catalogue is edited, so staff
    see their change immediately rather than waiting out the TTL."""
    with _lock:
        keys = [k for k in _store if not prefix or k.startswith(prefix)]
        for key in keys:
            _store.pop(key, None)
        return len(keys)


# Every cache key that depends on a product row. Stock and sold_count move on
# every order, so these are dropped whenever inventory changes rather than
# being left to expire — a page claiming "only 2 left" after the last two sold
# is worse than a database round trip.
CATALOGUE_PREFIXES = (
    "product:",
    "search:",
    "related:",
    "rails:",
    "facets:",
    "categories:",
    "category:",
)


def invalidate_catalogue() -> int:
    return sum(invalidate(prefix) for prefix in CATALOGUE_PREFIXES)


def stats() -> dict[str, int]:
    now = time.monotonic()
    with _lock:
        live = sum(1 for expires, _ in _store.values() if expires > now)
        return {"entries": len(_store), "live": live}
