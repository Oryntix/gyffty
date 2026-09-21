from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base, PKMixin, TimestampMixin
from app.models.enums import DiscountType


class Coupon(Base, PKMixin, TimestampMixin):
    """A redeemable discount.

    Validity windows and usage caps live here rather than in code so marketing
    can run a campaign without a deploy.
    """

    __tablename__ = "coupons"

    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(300))

    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType, native_enum=False), nullable=False
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    min_order_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # Caps the rupee value of a percentage discount, so 15% off never runs away.
    max_discount: Mapped[float | None] = mapped_column(Float)

    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    usage_limit: Mapped[int | None] = mapped_column(Integer)
    usage_limit_per_user: Mapped[int | None] = mapped_column(Integer)
    times_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Hidden codes still work, they just do not appear in the public list.
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def is_redeemable_at(self, when: datetime | None = None) -> bool:
        when = when or datetime.now(UTC)
        if not self.is_active:
            return False
        if self.starts_at and _aware(self.starts_at) > when:
            return False
        if self.expires_at and _aware(self.expires_at) < when:
            return False
        return not (self.usage_limit is not None and self.times_used >= self.usage_limit)

    def discount_for(self, subtotal: float) -> float:
        """Rupee discount this coupon yields on the given subtotal, or 0."""
        if subtotal < self.min_order_value:
            return 0.0
        if self.discount_type is DiscountType.PERCENT:
            amount = subtotal * self.value / 100
            if self.max_discount is not None:
                amount = min(amount, self.max_discount)
        else:
            amount = self.value
        return round(min(amount, subtotal), 2)


def _aware(value: datetime) -> datetime:
    """SQLite hands back naive datetimes; compare them as UTC."""
    return value if value.tzinfo else value.replace(tzinfo=UTC)
