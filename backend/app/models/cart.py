from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.user import User


class Cart(Base, PKMixin, TimestampMixin):
    """One open cart per user, or per guest session token."""

    __tablename__ = "carts"

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, unique=True
    )
    user: Mapped[User | None] = relationship(back_populates="cart")
    session_token: Mapped[str | None] = mapped_column(String(64), index=True, unique=True)

    items: Mapped[list[CartItem]] = relationship(
        back_populates="cart", cascade="all, delete-orphan"
    )

    @property
    def subtotal(self) -> float:
        return round(sum(item.line_total for item in self.items), 2)

    @property
    def item_count(self) -> int:
        return sum(item.quantity for item in self.items)


class CartItem(Base, PKMixin, TimestampMixin):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("cart_id", "product_id", name="uq_cart_product"),)

    cart_id: Mapped[int] = mapped_column(
        ForeignKey("carts.id", ondelete="CASCADE"), index=True, nullable=False
    )
    cart: Mapped[Cart] = relationship(back_populates="items")

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    product: Mapped[Product] = relationship()

    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)

    # Personalisation captured at add-to-cart time.
    gift_message: Mapped[str | None] = mapped_column(String(300))
    engraving_text: Mapped[str | None] = mapped_column(String(60))
    recipient_name: Mapped[str | None] = mapped_column(String(120))

    @property
    def line_total(self) -> float:
        return round(self.unit_price * self.quantity, 2)
