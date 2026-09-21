from __future__ import annotations

import secrets

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.models.cart import Cart, CartItem
from app.repositories.cart import CartRepository
from app.repositories.product import ProductRepository
from app.schemas.cart import CartItemCreate, CartItemRead, CartItemUpdate, CartRead, CartTotals
from app.schemas.product import ProductCard
from app.services.coupon_service import CouponService
from app.utils.pricing import compute_totals

log = get_logger(__name__)

MAX_QTY_PER_LINE = 20


class CartService:
    """A cart belongs to a user when signed in, otherwise to an opaque guest token."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.carts = CartRepository(db)
        self.products = ProductRepository(db)

    @staticmethod
    def new_session_token() -> str:
        return secrets.token_urlsafe(24)

    def resolve(self, *, user_id: int | None, session_token: str | None) -> Cart:
        # A brand-new cart is empty by definition, so there is nothing to read
        # back: skipping the refresh saves a round trip on the very first
        # add-to-cart, which is the one a shopper notices most.
        if user_id is not None:
            cart = self.carts.get_for_user(user_id)
            return cart or self.carts.create(Cart(user_id=user_id), refresh=False)
        if not session_token:
            raise ValidationError("A cart session token is required for guest carts.")
        cart = self.carts.get_for_session(session_token)
        return cart or self.carts.create(Cart(session_token=session_token), refresh=False)

    def merge_guest_cart(self, *, user_id: int, session_token: str) -> Cart:
        """Fold a guest cart into the account's cart at login.

        A guest cart can be days old, so every line is revalidated on the way
        in rather than trusted:

        * the price is re-read from the catalogue, never carried over — a stale
          `unit_price` would let someone hold yesterday's price indefinitely;
        * quantities are clamped to what is actually in stock;
        * withdrawn or deleted products are dropped instead of blocking login.

        Quantities for the same SKU are summed rather than duplicated, which is
        what shoppers expect (and what SAP Commerce, commercetools and
        WooCommerce all settled on).
        """
        guest = self.carts.get_for_session(session_token)
        target = self.resolve(user_id=user_id, session_token=None)
        if not guest or guest.id == target.id:
            return target

        for item in list(guest.items):
            product = self.products.get(item.product_id)
            if product is None or not product.is_active or product.stock_quantity <= 0:
                continue

            existing = self.carts.find_item(target, item.product_id)
            wanted = (existing.quantity if existing else 0) + item.quantity
            quantity = min(wanted, MAX_QTY_PER_LINE, product.stock_quantity)
            if quantity <= 0:
                continue

            if existing:
                existing.quantity = quantity
                existing.unit_price = product.price
                # Keep whichever personalisation the shopper actually filled in.
                existing.gift_message = existing.gift_message or item.gift_message
                existing.engraving_text = existing.engraving_text or item.engraving_text
                existing.recipient_name = existing.recipient_name or item.recipient_name
            else:
                target.items.append(
                    CartItem(
                        product_id=item.product_id,
                        quantity=quantity,
                        unit_price=product.price,
                        gift_message=item.gift_message,
                        engraving_text=item.engraving_text,
                        recipient_name=item.recipient_name,
                    )
                )

        # The guest cart and its token are destroyed, so the token cannot be
        # replayed later to reach an account's cart.
        self.carts.delete(guest, commit=False)
        self.db.commit()
        log.info("cart.merged", user_id=user_id, lines=len(target.items))
        return self.resolve(user_id=user_id, session_token=None)

    def add_item(self, cart: Cart, payload: CartItemCreate) -> Cart:
        product = self.products.get(payload.product_id)
        if not product or not product.is_active:
            raise NotFoundError("That hamper is no longer available.")
        if product.stock_quantity < payload.quantity:
            raise ValidationError(
                f"Only {product.stock_quantity} left in stock.",
                details={"available": product.stock_quantity},
            )
        if payload.engraving_text and not product.allows_engraving:
            raise ValidationError("This hamper cannot be engraved.")

        existing = self.carts.find_item(cart, product.id)
        if existing:
            existing.quantity = min(existing.quantity + payload.quantity, MAX_QTY_PER_LINE)
            existing.gift_message = payload.gift_message or existing.gift_message
            existing.engraving_text = payload.engraving_text or existing.engraving_text
            existing.recipient_name = payload.recipient_name or existing.recipient_name
        else:
            cart.items.append(
                CartItem(
                    # Assign the object, not just the id: the new line then
                    # already carries its product and needs no reload before
                    # it can be serialised.
                    product=product,
                    quantity=payload.quantity,
                    unit_price=product.price,
                    gift_message=payload.gift_message,
                    engraving_text=payload.engraving_text,
                    recipient_name=payload.recipient_name,
                )
            )
        self.db.commit()
        return cart

    def update_item(self, cart: Cart, item_id: int, payload: CartItemUpdate) -> Cart:
        item = next((i for i in cart.items if i.id == item_id), None)
        if not item:
            raise NotFoundError("That cart line no longer exists.")
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        self.db.commit()
        return cart

    def remove_item(self, cart: Cart, item_id: int) -> Cart:
        item = next((i for i in cart.items if i.id == item_id), None)
        if not item:
            raise NotFoundError("That cart line no longer exists.")
        cart.items.remove(item)
        self.db.commit()
        return cart

    def clear(self, cart: Cart) -> Cart:
        cart.items.clear()
        self.db.commit()
        return cart

    def to_schema(
        self,
        cart: Cart,
        *,
        coupon_code: str | None = None,
        user_id: int | None = None,
    ) -> CartRead:
        items = [
            CartItemRead(
                id=item.id,
                product=ProductCard.model_validate(item.product),
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
                gift_message=item.gift_message,
                engraving_text=item.engraving_text,
                recipient_name=item.recipient_name,
            )
            for item in cart.items
        ]
        outcome = CouponService(self.db).evaluate(coupon_code, cart.subtotal, user_id=user_id)
        totals = compute_totals(cart.subtotal, discount=outcome.discount)
        return CartRead(
            id=cart.id,
            items=items,
            item_count=cart.item_count,
            coupon_code=outcome.code if outcome.accepted else None,
            coupon_message=outcome.reason,
            totals=CartTotals(
                subtotal=totals.subtotal,
                discount_total=totals.discount_total,
                shipping_fee=totals.shipping_fee,
                tax_total=totals.tax_total,
                grand_total=totals.grand_total,
                free_shipping_threshold=settings.FREE_SHIPPING_THRESHOLD,
                amount_to_free_shipping=totals.amount_to_free_shipping,
                currency=settings.CURRENCY,
            ),
        )
