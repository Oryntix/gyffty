"""Coupon validation and redemption."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.exceptions import ValidationError
from app.models.coupon import Coupon
from app.repositories.coupon import CouponRepository


@dataclass(frozen=True)
class CouponOutcome:
    """The result of applying a code. `reason` is customer-facing copy."""

    code: str | None
    discount: float
    accepted: bool
    reason: str | None = None
    coupon: Coupon | None = None


class CouponService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.coupons = CouponRepository(db)

    def evaluate(
        self, code: str | None, subtotal: float, *, user_id: int | None = None
    ) -> CouponOutcome:
        """Never raises for a bad code: an invalid coupon shows a message and
        the cart still prices correctly at full value."""
        if not code or not code.strip():
            return CouponOutcome(code=None, discount=0.0, accepted=False)

        normalised = code.upper().strip()
        coupon = self.coupons.get_by_code(normalised)

        if coupon is None:
            return CouponOutcome(
                code=normalised,
                discount=0.0,
                accepted=False,
                reason="That code does not exist.",
            )
        if not coupon.is_redeemable_at():
            return CouponOutcome(
                code=normalised,
                discount=0.0,
                accepted=False,
                reason="That code has expired or is fully claimed.",
            )
        if subtotal < coupon.min_order_value:
            shortfall = coupon.min_order_value - subtotal
            return CouponOutcome(
                code=normalised,
                discount=0.0,
                accepted=False,
                reason=f"Spend {shortfall:,.0f} more to use this code.",
                coupon=coupon,
            )
        if (
            user_id is not None
            and coupon.usage_limit_per_user is not None
            and self.coupons.times_used_by(normalised, user_id) >= coupon.usage_limit_per_user
        ):
            return CouponOutcome(
                code=normalised,
                discount=0.0,
                accepted=False,
                reason="You have already used this code.",
                coupon=coupon,
            )

        discount = coupon.discount_for(subtotal)
        if discount <= 0:
            return CouponOutcome(
                code=normalised,
                discount=0.0,
                accepted=False,
                reason="That code does not apply to this order.",
                coupon=coupon,
            )
        return CouponOutcome(code=normalised, discount=discount, accepted=True, coupon=coupon)

    def redeem(self, outcome: CouponOutcome) -> None:
        """Increment the usage counter. Called inside the checkout transaction."""
        if outcome.accepted and outcome.coupon is not None:
            self.coupons.record_redemption(outcome.coupon)

    def require_valid(self, code: str, subtotal: float, *, user_id: int | None) -> CouponOutcome:
        outcome = self.evaluate(code, subtotal, user_id=user_id)
        if not outcome.accepted:
            raise ValidationError(outcome.reason or "That code cannot be used.")
        return outcome
