"""Payment gateway abstraction.

Checkout depends on this interface, never on a specific gateway. `MockProvider`
keeps the whole flow exercisable with no merchant account; `RazorpayProvider`
implements the same three calls against the real API. Switching is one env var.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass
from typing import Protocol

import httpx

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.logging import get_logger

log = get_logger(__name__)


class PaymentError(AppError):
    code = "payment_error"
    status_code = 402


@dataclass(frozen=True)
class PaymentIntent:
    """What the storefront needs to open a checkout widget."""

    provider: str
    intent_id: str
    amount_minor: int
    currency: str
    public_key: str | None = None


@dataclass(frozen=True)
class PaymentVerification:
    verified: bool
    reference: str
    raw: dict


class PaymentProvider(Protocol):
    name: str

    def create_intent(
        self, *, amount_minor: int, currency: str, order_number: str, email: str
    ) -> PaymentIntent: ...

    def verify_callback(self, payload: dict) -> PaymentVerification: ...

    def verify_webhook(self, body: bytes, signature: str) -> bool: ...


class MockProvider:
    """Deterministic stand-in. Accepts any callback carrying its own intent id."""

    name = "mock"

    def create_intent(
        self, *, amount_minor: int, currency: str, order_number: str, email: str
    ) -> PaymentIntent:
        return PaymentIntent(
            provider=self.name,
            intent_id=f"mock_{order_number}_{secrets.token_hex(6)}",
            amount_minor=amount_minor,
            currency=currency,
            public_key=None,
        )

    def verify_callback(self, payload: dict) -> PaymentVerification:
        intent_id = str(payload.get("intent_id", ""))
        ok = intent_id.startswith("mock_")
        return PaymentVerification(
            verified=ok, reference=intent_id or "mock_unverified", raw=payload
        )

    def verify_webhook(self, body: bytes, signature: str) -> bool:
        # No shared secret in mock mode; accept so the flow can be tested locally.
        return not settings.is_production


class RazorpayProvider:
    """Razorpay Orders API. Signature scheme per their checkout docs."""

    name = "razorpay"
    API = "https://api.razorpay.com/v1"

    def __init__(self) -> None:
        if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
            raise PaymentError("Razorpay credentials are not configured.")
        self._auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)

    def create_intent(
        self, *, amount_minor: int, currency: str, order_number: str, email: str
    ) -> PaymentIntent:
        try:
            response = httpx.post(
                f"{self.API}/orders",
                auth=self._auth,
                timeout=15,
                json={
                    "amount": amount_minor,
                    "currency": currency,
                    "receipt": order_number,
                    "notes": {"order_number": order_number, "email": email},
                },
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            log.error("payment.intent_failed", provider=self.name, error=str(exc))
            raise PaymentError("Could not reach the payment gateway.") from exc

        data = response.json()
        return PaymentIntent(
            provider=self.name,
            intent_id=data["id"],
            amount_minor=data["amount"],
            currency=data["currency"],
            public_key=settings.RAZORPAY_KEY_ID,
        )

    def verify_callback(self, payload: dict) -> PaymentVerification:
        order_id = payload.get("razorpay_order_id", "")
        payment_id = payload.get("razorpay_payment_id", "")
        signature = payload.get("razorpay_signature", "")
        expected = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            f"{order_id}|{payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()
        return PaymentVerification(
            verified=hmac.compare_digest(expected, signature),
            reference=payment_id or order_id,
            raw=payload,
        )

    def verify_webhook(self, body: bytes, signature: str) -> bool:
        secret = settings.RAZORPAY_WEBHOOK_SECRET
        if not secret:
            log.warning("payment.webhook_secret_missing", provider=self.name)
            return False
        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)


_provider: PaymentProvider | None = None


def get_payment_provider() -> PaymentProvider:
    global _provider
    if _provider is None:
        _provider = (
            RazorpayProvider() if settings.PAYMENT_PROVIDER == "razorpay" else MockProvider()
        )
        log.info("payment.provider_selected", provider=_provider.name)
    return _provider


def reset_payment_provider() -> None:
    """Test hook."""
    global _provider
    _provider = None


def to_minor_units(amount: float) -> int:
    """Rupees to paise. Gateways reject floats, and rounding must happen once."""
    return int(round(amount * 100))


def webhook_event_name(body: bytes) -> str:
    try:
        return str(json.loads(body).get("event", "unknown"))
    except (json.JSONDecodeError, AttributeError):
        return "unparseable"
