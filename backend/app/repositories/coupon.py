from __future__ import annotations

from sqlalchemy import func, select

from app.models.coupon import Coupon
from app.models.order import Order
from app.repositories.base import BaseRepository


class CouponRepository(BaseRepository[Coupon]):
    model = Coupon

    def get_by_code(self, code: str) -> Coupon | None:
        return self.get_by(code=code.upper().strip())

    def list_public(self) -> list[Coupon]:
        stmt = (
            select(Coupon)
            .where(Coupon.is_active.is_(True), Coupon.is_public.is_(True))
            .order_by(Coupon.min_order_value)
        )
        return [c for c in self.db.execute(stmt).scalars() if c.is_redeemable_at()]

    def times_used_by(self, coupon_code: str, user_id: int) -> int:
        """Per-user redemption count, derived from orders rather than a counter
        table, so it stays correct even if an order is created out of band."""
        stmt = (
            select(func.count())
            .select_from(Order)
            .where(
                Order.user_id == user_id,
                func.upper(Order.coupon_code) == coupon_code.upper(),
                Order.status != "cancelled",
            )
        )
        return int(self.db.execute(stmt).scalar_one())

    def record_redemption(self, coupon: Coupon) -> None:
        coupon.times_used += 1
