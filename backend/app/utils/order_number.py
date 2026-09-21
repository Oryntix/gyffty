from __future__ import annotations

import secrets
from datetime import UTC, datetime


def generate_order_number(prefix: str = "GYF") -> str:
    stamp = datetime.now(UTC).strftime("%y%m%d")
    return f"{prefix}-{stamp}-{secrets.token_hex(3).upper()}"
