from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, Header, Request, status

from app.api.deps import CartToken, CurrentUser, DbSession, OptionalUser, Pagination
from app.core.config import settings
from app.core.exceptions import ValidationError
from app.core.logging import get_logger
from app.core.ratelimit import rate_limit
from app.repositories.coupon import CouponRepository
from app.schemas.common import Message, Page
from app.schemas.order import (
    CheckoutRequest,
    CheckoutResponse,
    CouponPreviewRequest,
    CouponPreviewResponse,
    CouponRead,
    OrderRead,
    PaymentConfirmRequest,
    PaymentIntentRead,
)
from app.services.cart_service import CartService
from app.services.coupon_service import CouponService
from app.services.email_service import send_order_confirmation
from app.services.order_service import OrderService
from app.services.payment_service import get_payment_provider, webhook_event_name

router = APIRouter(tags=["orders"])
log = get_logger(__name__)

checkout_limit = rate_limit(
    "checkout", lambda: settings.RATE_LIMIT_CHECKOUT_PER_MINUTE, window_seconds=60
)


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(checkout_limit)],
)
def checkout(
    payload: CheckoutRequest,
    background: BackgroundTasks,
    db: DbSession,
    user: OptionalUser,
    cart_token: CartToken,
) -> CheckoutResponse:
    """Place an order. Guest checkout is supported; a signed-in order is
    attached to the account. Returns a payment intent the storefront uses to
    open the gateway widget."""
    cart = CartService(db).resolve(user_id=user.id if user else None, session_token=cart_token)
    order, intent = OrderService(db).place_order(
        cart=cart, payload=payload, user_id=user.id if user else None
    )

    # The receipt is sent after the response is flushed: a slow SMTP server
    # must not make the shopper wait on the confirmation page.
    background.add_task(send_order_confirmation, order)

    return CheckoutResponse(
        order=order,
        payment=PaymentIntentRead(**intent.__dict__) if intent else None,
    )


@router.post("/payment/confirm", response_model=OrderRead)
def confirm_payment(payload: PaymentConfirmRequest, db: DbSession) -> OrderRead:
    """Client-side confirmation after the gateway widget closes.

    This is a convenience for updating the UI quickly. The webhook is the
    authoritative signal, because a client can always close the tab.
    """
    verification = get_payment_provider().verify_callback(payload.payload)
    service = OrderService(db)
    if not verification.verified:
        service.mark_payment_failed(payload.order_number, "signature_mismatch")
        raise ValidationError("We could not verify that payment.")
    return service.mark_paid(payload.order_number, verification.reference)


@router.post("/payment/webhook", response_model=Message, include_in_schema=False)
async def payment_webhook(
    request: Request,
    db: DbSession,
    x_razorpay_signature: str = Header(default=""),
) -> Message:
    """Gateway-to-server notification. Always answers 200 once the signature
    checks out, so the provider stops retrying a message we have accepted."""
    body = await request.body()
    provider = get_payment_provider()

    if not provider.verify_webhook(body, x_razorpay_signature):
        log.warning("payment.webhook_rejected", provider=provider.name)
        raise ValidationError("Invalid webhook signature.")

    event = webhook_event_name(body)
    import json

    data = json.loads(body or b"{}")
    entity = (
        data.get("payload", {}).get("payment", {}).get("entity", {})
        if isinstance(data.get("payload"), dict)
        else {}
    )
    reference = entity.get("order_id") or data.get("intent_id", "")
    service = OrderService(db)
    order = service.find_by_payment_reference(reference) if reference else None

    if order is None:
        log.warning("payment.webhook_unmatched", gateway_event=event, reference=reference)
        return Message(message="ignored")

    if event in {"payment.captured", "order.paid", "payment.succeeded"}:
        service.mark_paid(order.order_number, entity.get("id", reference))
    elif event in {"payment.failed"}:
        service.mark_payment_failed(order.order_number, entity.get("error_reason", event))

    log.info("payment.webhook_handled", gateway_event=event, order_number=order.order_number)
    return Message(message="ok")


@router.get("", response_model=Page[OrderRead])
def my_orders(db: DbSession, user: CurrentUser, page: Pagination) -> Page[OrderRead]:
    items, total = OrderService(db).list_for_user(user.id, limit=page.page_size, offset=page.offset)
    return Page.build(items, total, page.page, page.page_size)


@router.get("/coupons", response_model=list[CouponRead])
def available_coupons(db: DbSession) -> list[CouponRead]:
    return [
        CouponRead(
            code=c.code,
            label=c.label,
            description=c.description,
            min_order_value=c.min_order_value,
        )
        for c in CouponRepository(db).list_public()
    ]


@router.post("/coupons/preview", response_model=CouponPreviewResponse)
def preview_coupon(
    payload: CouponPreviewRequest, db: DbSession, user: OptionalUser
) -> CouponPreviewResponse:
    """Check a code without committing to it, for live checkout feedback."""
    outcome = CouponService(db).evaluate(
        payload.code, payload.subtotal, user_id=user.id if user else None
    )
    return CouponPreviewResponse(
        code=outcome.code,
        accepted=outcome.accepted,
        discount=outcome.discount,
        message=outcome.reason,
    )


@router.get("/{order_number}", response_model=OrderRead)
def track_order(order_number: str, db: DbSession, user: OptionalUser) -> OrderRead:
    return OrderService(db).get(order_number, user_id=user.id if user else None)


@router.post("/{order_number}/cancel", response_model=OrderRead)
def cancel_order(order_number: str, db: DbSession, user: CurrentUser) -> OrderRead:
    return OrderService(db).cancel(order_number, user.id)
