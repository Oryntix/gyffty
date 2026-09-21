from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cache import invalidate_catalogue
from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.models.cart import Cart
from app.models.enums import OrderStatus, PaymentStatus
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.repositories.order import OrderRepository
from app.repositories.product import ProductRepository
from app.schemas.order import CheckoutRequest, OrderRead
from app.services.coupon_service import CouponService
from app.services.payment_service import (
    PaymentIntent,
    get_payment_provider,
    to_minor_units,
)
from app.utils.order_number import generate_order_number
from app.utils.pricing import compute_totals

log = get_logger(__name__)

# A customer may cancel only while the hamper is still in the studio.
CANCELLABLE = {OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PACKED}

# Statuses that mean the money is ours and stock should stay decremented.
SETTLED = {PaymentStatus.PAID}


class OrderService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.orders = OrderRepository(db)
        self.products = ProductRepository(db)
        self.coupons = CouponService(db)

    # ---------------------------------------------------------------- place --

    def place_order(
        self, *, cart: Cart, payload: CheckoutRequest, user_id: int | None
    ) -> tuple[OrderRead, PaymentIntent | None]:
        """Create the order in one transaction.

        Rows are locked for update while stock is checked and decremented, so two
        shoppers racing for the last hamper cannot both win. The whole thing
        commits once: either the order, the stock movement and the coupon
        redemption all land, or none of them do.
        """
        if not cart.items:
            raise ValidationError("Your cart is empty.")

        product_ids = [item.product_id for item in cart.items]
        locked = self._lock_products(product_ids)

        for item in cart.items:
            product = locked.get(item.product_id)
            if product is None or not product.is_active:
                raise ConflictError(f"{item.product.name} is no longer available.")
            if product.stock_quantity < item.quantity:
                raise ConflictError(
                    f"{product.name} only has {product.stock_quantity} left.",
                    details={"product_id": product.id, "available": product.stock_quantity},
                )

        subtotal = round(sum(i.unit_price * i.quantity for i in cart.items), 2)
        outcome = self.coupons.evaluate(payload.coupon_code, subtotal, user_id=user_id)
        if payload.coupon_code and not outcome.accepted:
            raise ValidationError(outcome.reason or "That code cannot be used.")

        totals = compute_totals(subtotal, discount=outcome.discount)
        ship = payload.shipping_address

        order = Order(
            order_number=generate_order_number(),
            user_id=user_id,
            contact_email=str(payload.contact_email).lower(),
            contact_phone=payload.contact_phone,
            ship_to_name=ship.full_name,
            ship_to_phone=ship.phone,
            ship_line1=ship.line1,
            ship_line2=ship.line2,
            ship_city=ship.city,
            ship_state=ship.state,
            ship_pincode=ship.pincode,
            ship_country=ship.country,
            delivery_date=payload.delivery_date,
            delivery_slot=payload.delivery_slot,
            delivery_instructions=payload.delivery_instructions,
            subtotal=totals.subtotal,
            discount_total=totals.discount_total,
            shipping_fee=totals.shipping_fee,
            tax_total=totals.tax_total,
            grand_total=totals.grand_total,
            currency=settings.CURRENCY,
            coupon_code=outcome.code if outcome.accepted else None,
            status=OrderStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
        )

        for item in cart.items:
            product = locked[item.product_id]
            primary = next(
                (i.url for i in product.images if i.is_primary),
                product.images[0].url if product.images else None,
            )
            order.items.append(
                OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    product_slug=product.slug,
                    product_sku=product.sku,
                    image_url=primary,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    line_total=round(item.unit_price * item.quantity, 2),
                    gift_message=item.gift_message,
                    engraving_text=item.engraving_text,
                    recipient_name=item.recipient_name,
                )
            )
            product.stock_quantity -= item.quantity
            product.sold_count += item.quantity

        self.coupons.redeem(outcome)
        self.db.add(order)
        cart.items.clear()
        self.db.commit()
        self.db.refresh(order)

        # Stock just moved, so any cached view of it is now wrong.
        invalidate_catalogue()

        log.info(
            "order.placed",
            order_number=order.order_number,
            total=order.grand_total,
            items=len(order.items),
            user_id=user_id,
        )

        intent = self._create_intent(order)
        return OrderRead.model_validate(order), intent

    def _lock_products(self, product_ids: list[int]) -> dict[int, Product]:
        """SELECT ... FOR UPDATE on Postgres; a no-op lock on SQLite, which
        serialises writes anyway."""
        stmt = select(Product).where(Product.id.in_(product_ids))
        if self.db.bind and self.db.bind.dialect.name == "postgresql":
            stmt = stmt.with_for_update()
        return {p.id: p for p in self.db.execute(stmt).scalars().unique()}

    def _create_intent(self, order: Order) -> PaymentIntent | None:
        """A gateway failure must not lose an order that is already recorded."""
        try:
            provider = get_payment_provider()
            intent = provider.create_intent(
                amount_minor=to_minor_units(order.grand_total),
                currency=order.currency,
                order_number=order.order_number,
                email=order.contact_email,
            )
            order.payment_reference = intent.intent_id
            self.db.commit()
            return intent
        except Exception as exc:  # noqa: BLE001
            log.error("order.intent_failed", order_number=order.order_number, error=str(exc))
            return None

    # --------------------------------------------------------------- payment --

    def mark_paid(self, order_number: str, reference: str) -> OrderRead:
        order = self.orders.get_by_number(order_number)
        if not order:
            raise NotFoundError("We could not find that order.")
        if order.payment_status is PaymentStatus.PAID:
            # Gateways retry webhooks; confirming twice must be harmless.
            return OrderRead.model_validate(order)

        order.payment_status = PaymentStatus.PAID
        order.payment_reference = reference
        if order.status is OrderStatus.PENDING:
            order.status = OrderStatus.CONFIRMED
        self.db.commit()
        self.db.refresh(order)
        log.info("order.paid", order_number=order.order_number, reference=reference)
        return OrderRead.model_validate(order)

    def mark_payment_failed(self, order_number: str, reason: str) -> None:
        order = self.orders.get_by_number(order_number)
        if not order or order.payment_status is PaymentStatus.PAID:
            return
        order.payment_status = PaymentStatus.FAILED
        self.db.commit()
        log.warning("order.payment_failed", order_number=order_number, reason=reason)

    def find_by_payment_reference(self, reference: str) -> Order | None:
        stmt = select(Order).where(Order.payment_reference == reference)
        return self.db.execute(stmt).scalars().first()

    # ----------------------------------------------------------------- read --

    def get(self, order_number: str, *, user_id: int | None = None) -> OrderRead:
        order = self.orders.get_by_number(order_number)
        if not order:
            raise NotFoundError("We could not find that order.")
        # A guest order (user_id None) stays reachable by its number alone; an
        # order owned by someone else is invisible.
        if order.user_id is not None and order.user_id != user_id:
            raise NotFoundError("We could not find that order.")
        return OrderRead.model_validate(order)

    def list_for_user(
        self, user_id: int, *, limit: int, offset: int
    ) -> tuple[list[OrderRead], int]:
        rows, total = self.orders.list_for_user(user_id, limit=limit, offset=offset)
        return [OrderRead.model_validate(o) for o in rows], total

    # --------------------------------------------------------------- mutate --

    def cancel(self, order_number: str, user_id: int) -> OrderRead:
        order = self.orders.get_by_number(order_number)
        if not order or order.user_id != user_id:
            raise NotFoundError("We could not find that order.")
        if order.status not in CANCELLABLE:
            raise ConflictError(f"An order that is {order.status} can no longer be cancelled.")

        order.status = OrderStatus.CANCELLED
        if order.payment_status is PaymentStatus.PAID:
            order.payment_status = PaymentStatus.REFUNDED

        for item in order.items:
            if item.product_id:
                product = self.products.get(item.product_id)
                if product:
                    product.stock_quantity += item.quantity
                    product.sold_count = max(0, product.sold_count - item.quantity)
        self.db.commit()
        self.db.refresh(order)
        invalidate_catalogue()  # stock was returned
        log.info("order.cancelled", order_number=order.order_number)
        return OrderRead.model_validate(order)

    def update_status(self, order_number: str, status: OrderStatus) -> OrderRead:
        """Staff transition. Restocking is handled by `cancel`, not here."""
        order = self.orders.get_by_number(order_number)
        if not order:
            raise NotFoundError("We could not find that order.")
        if status is OrderStatus.CANCELLED:
            raise ValidationError("Use the cancel endpoint so stock is restored.")
        order.status = status
        self.db.commit()
        self.db.refresh(order)
        log.info("order.status_changed", order_number=order.order_number, status=status)
        return OrderRead.model_validate(order)
