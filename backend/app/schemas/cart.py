from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.product import ProductCard


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=20)
    gift_message: str | None = Field(default=None, max_length=300)
    engraving_text: str | None = Field(default=None, max_length=60)
    recipient_name: str | None = Field(default=None, max_length=120)


class CartItemUpdate(BaseModel):
    quantity: int | None = Field(default=None, ge=1, le=20)
    gift_message: str | None = Field(default=None, max_length=300)
    engraving_text: str | None = Field(default=None, max_length=60)
    recipient_name: str | None = Field(default=None, max_length=120)


class CartItemRead(ORMModel):
    id: int
    product: ProductCard
    quantity: int
    unit_price: float
    line_total: float
    gift_message: str | None = None
    engraving_text: str | None = None
    recipient_name: str | None = None


class CartTotals(BaseModel):
    subtotal: float
    discount_total: float = 0.0
    shipping_fee: float = 0.0
    tax_total: float = 0.0
    grand_total: float
    free_shipping_threshold: float
    amount_to_free_shipping: float = 0.0
    currency: str = "INR"


class CartRead(BaseModel):
    id: int
    items: list[CartItemRead] = []
    item_count: int = 0
    totals: CartTotals
    coupon_code: str | None = None
    # Why a submitted code was not applied, shown under the coupon field.
    coupon_message: str | None = None
