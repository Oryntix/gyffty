from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import OrderStatus, PaymentStatus
from app.schemas.common import ORMModel


class ShippingAddressIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=6, max_length=20)
    line1: str = Field(min_length=3, max_length=200)
    line2: str | None = Field(default=None, max_length=200)
    city: str = Field(max_length=80)
    state: str = Field(max_length=80)
    pincode: str = Field(min_length=4, max_length=10)
    country: str = "India"


class CheckoutRequest(BaseModel):
    contact_email: EmailStr
    contact_phone: str = Field(min_length=6, max_length=20)
    shipping_address: ShippingAddressIn
    delivery_date: date | None = None
    delivery_slot: str | None = Field(default=None, max_length=40)
    delivery_instructions: str | None = None
    coupon_code: str | None = None


class OrderItemRead(ORMModel):
    id: int
    product_id: int | None = None
    product_name: str
    product_slug: str
    product_sku: str
    image_url: str | None = None
    quantity: int
    unit_price: float
    line_total: float
    gift_message: str | None = None
    engraving_text: str | None = None
    recipient_name: str | None = None


class OrderRead(ORMModel):
    id: int
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    contact_email: str
    contact_phone: str
    ship_to_name: str
    ship_line1: str
    ship_line2: str | None = None
    ship_city: str
    ship_state: str
    ship_pincode: str
    ship_country: str
    delivery_date: date | None = None
    delivery_slot: str | None = None
    subtotal: float
    discount_total: float
    shipping_fee: float
    tax_total: float
    grand_total: float
    currency: str
    coupon_code: str | None = None
    created_at: datetime
    items: list[OrderItemRead] = []


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class PaymentIntentRead(BaseModel):
    provider: str
    intent_id: str
    amount_minor: int
    currency: str
    public_key: str | None = None


class CheckoutResponse(BaseModel):
    order: OrderRead
    payment: PaymentIntentRead | None = None


class PaymentConfirmRequest(BaseModel):
    order_number: str = Field(max_length=24)
    # Gateway-specific fields, passed through to the provider for verification.
    payload: dict = Field(default_factory=dict)


class CouponRead(BaseModel):
    code: str
    label: str
    description: str | None = None
    min_order_value: float


class CouponPreviewRequest(BaseModel):
    code: str = Field(max_length=40)
    subtotal: float = Field(ge=0)


class CouponPreviewResponse(BaseModel):
    code: str | None = None
    accepted: bool
    discount: float
    message: str | None = None
