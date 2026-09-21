from __future__ import annotations

from slugify import slugify


def make_slug(value: str, *, suffix: str | None = None) -> str:
    base = slugify(value)[:200]
    return f"{base}-{suffix}" if suffix else base
