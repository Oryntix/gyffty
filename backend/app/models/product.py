from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, PKMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.review import Review


class Product(Base, PKMixin, TimestampMixin):
    """A gift hamper SKU."""

    __tablename__ = "products"

    sku: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True, nullable=False)
    short_description: Mapped[str | None] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)

    price: Mapped[float] = mapped_column(Float, nullable=False)
    compare_at_price: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)

    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    category: Mapped[Category] = relationship(back_populates="products")

    # Merchandising facets, denormalised as CSV so listing-page filters stay one query.
    occasion_tags: Mapped[str | None] = mapped_column(String(300))
    recipient_tags: Mapped[str | None] = mapped_column(String(300))
    theme_tags: Mapped[str | None] = mapped_column(String(300))

    is_customisable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allows_message_card: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allows_engraving: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_bestseller: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_new_arrival: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_luxe: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    same_day_delivery: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    rating_average: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sold_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    seo_title: Mapped[str | None] = mapped_column(String(200))
    seo_description: Mapped[str | None] = mapped_column(String(320))

    images: Mapped[list[ProductImage]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.display_order",
    )
    inclusions: Mapped[list[ProductInclusion]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductInclusion.display_order",
    )
    reviews: Mapped[list[Review]] = relationship(back_populates="product")

    @property
    def discount_percent(self) -> int:
        if not self.compare_at_price or self.compare_at_price <= self.price:
            return 0
        return round((self.compare_at_price - self.price) / self.compare_at_price * 100)

    @property
    def in_stock(self) -> bool:
        return self.stock_quantity > 0


class ProductImage(Base, PKMixin):
    __tablename__ = "product_images"

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    product: Mapped[Product] = relationship(back_populates="images")
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(200))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class ProductInclusion(Base, PKMixin):
    """One physical item inside the hamper, rendered as the What's Inside list."""

    __tablename__ = "product_inclusions"

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    product: Mapped[Product] = relationship(back_populates="inclusions")
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    quantity: Mapped[str | None] = mapped_column(String(60))
    note: Mapped[str | None] = mapped_column(String(200))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
