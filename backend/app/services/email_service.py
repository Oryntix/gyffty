"""Transactional email.

The console backend logs what would have been sent, so development and tests
exercise the same code path as production without needing SMTP credentials.
Sending never raises into a request: a failed receipt must not fail a paid order.
"""

from __future__ import annotations

import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.order import OrderRead

log = get_logger(__name__)


@dataclass(frozen=True)
class Email:
    to: str
    subject: str
    text_body: str
    html_body: str | None = None


class ConsoleBackend:
    name = "console"

    def send(self, email: Email) -> bool:
        log.info(
            "email.rendered",
            backend=self.name,
            to=email.to,
            subject=email.subject,
            preview=email.text_body[:160].replace("\n", " "),
        )
        return True


class SMTPBackend:
    name = "smtp"

    def send(self, email: Email) -> bool:
        message = EmailMessage()
        message["From"] = settings.EMAIL_FROM
        message["To"] = email.to
        message["Subject"] = email.subject
        if settings.EMAIL_REPLY_TO:
            message["Reply-To"] = settings.EMAIL_REPLY_TO
        message.set_content(email.text_body)
        if email.html_body:
            message.add_alternative(email.html_body, subtype="html")

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
        log.info("email.sent", backend=self.name, to=email.to, subject=email.subject)
        return True


_backend = None


def get_backend():
    global _backend
    if _backend is None:
        _backend = SMTPBackend() if settings.EMAIL_BACKEND == "smtp" else ConsoleBackend()
    return _backend


def reset_backend() -> None:
    """Test hook."""
    global _backend
    _backend = None


def send_email(email: Email) -> bool:
    """Best-effort send. Returns success, never raises."""
    try:
        return get_backend().send(email)
    except Exception as exc:  # noqa: BLE001 - a receipt must never break checkout
        log.error("email.failed", to=email.to, subject=email.subject, error=str(exc))
        return False


def _money(amount: float, currency: str) -> str:
    symbol = "₹" if currency == "INR" else f"{currency} "
    return f"{symbol}{amount:,.2f}"


def order_confirmation(order: OrderRead) -> Email:
    lines = [
        f"  {item.quantity} x {item.product_name}" f"  {_money(item.line_total, order.currency)}"
        for item in order.items
    ]
    personalisation = [
        f"  Note for {item.recipient_name or 'the recipient'}: {item.gift_message}"
        for item in order.items
        if item.gift_message
    ]

    text = f"""Thank you for your order.

Order {order.order_number}
Placed {order.created_at:%d %b %Y}

What is coming
{chr(10).join(lines)}
{chr(10).join(personalisation)}

Subtotal      {_money(order.subtotal, order.currency)}
Discount      -{_money(order.discount_total, order.currency)}
Shipping      {_money(order.shipping_fee, order.currency)}
GST           {_money(order.tax_total, order.currency)}
Total         {_money(order.grand_total, order.currency)}

Delivering to
{order.ship_to_name}
{order.ship_line1}
{order.ship_city}, {order.ship_state} {order.ship_pincode}

Track it any time: {settings.STOREFRONT_URL}/order/{order.order_number}

Gyffty — the art of bespoke giving
"""
    return Email(
        to=order.contact_email,
        subject=f"Your Gyffty order {order.order_number} is confirmed",
        text_body=text,
    )


def send_order_confirmation(order: OrderRead) -> bool:
    return send_email(order_confirmation(order))


def order_shipped(order: OrderRead) -> Email:
    text = f"""Your hamper is on its way.

Order {order.order_number} has left our studio and is out for delivery to
{order.ship_to_name}, {order.ship_city}.

Track it: {settings.STOREFRONT_URL}/order/{order.order_number}

Gyffty
"""
    return Email(
        to=order.contact_email,
        subject=f"Your Gyffty order {order.order_number} has shipped",
        text_body=text,
    )


def send_order_shipped(order: OrderRead) -> bool:
    return send_email(order_shipped(order))
