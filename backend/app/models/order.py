from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, PKMixin, TimestampMixin
from app.models.enums import OrderStatus, PaymentStatus

if TYPE_CHECKING:
    from app.models.user import User


class Order(Base, PKMixin, TimestampMixin):
    __tablename__ = "orders"

    order_number: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    user: Mapped[User | None] = relationship(back_populates="orders")

    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)

    # Shipping snapshot. Addresses can be edited later; an order must not change.
    ship_to_name: Mapped[str] = mapped_column(String(120), nullable=False)
    ship_to_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    ship_line1: Mapped[str] = mapped_column(String(200), nullable=False)
    ship_line2: Mapped[str | None] = mapped_column(String(200))
    ship_city: Mapped[str] = mapped_column(String(80), nullable=False)
    ship_state: Mapped[str] = mapped_column(String(80), nullable=False)
    ship_pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    ship_country: Mapped[str] = mapped_column(String(80), default="India", nullable=False)

    delivery_date: Mapped[date | None] = mapped_column(Date)
    delivery_slot: Mapped[str | None] = mapped_column(String(40))
    delivery_instructions: Mapped[str | None] = mapped_column(Text)

    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    discount_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    shipping_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tax_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    grand_total: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    coupon_code: Mapped[str | None] = mapped_column(String(40))

    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, native_enum=False),
        default=OrderStatus.PENDING,
        nullable=False,
        index=True,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, native_enum=False), default=PaymentStatus.PENDING, nullable=False
    )
    payment_reference: Mapped[str | None] = mapped_column(String(120))

    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base, PKMixin):
    """Line item snapshot. Product fields are copied so history survives catalogue edits."""

    __tablename__ = "order_items"

    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), index=True, nullable=False
    )
    order: Mapped[Order] = relationship(back_populates="items")

    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"))
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    product_slug: Mapped[str] = mapped_column(String(220), nullable=False)
    product_sku: Mapped[str] = mapped_column(String(40), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500))

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    line_total: Mapped[float] = mapped_column(Float, nullable=False)

    gift_message: Mapped[str | None] = mapped_column(String(300))
    engraving_text: Mapped[str | None] = mapped_column(String(60))
    recipient_name: Mapped[str | None] = mapped_column(String(120))
