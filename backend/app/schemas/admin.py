from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.enums import DiscountType, OrderStatus
from app.schemas.common import ORMModel


class AdminCouponBase(BaseModel):
    label: str = Field(max_length=120)
    description: str | None = Field(default=None, max_length=300)
    discount_type: DiscountType
    value: float = Field(gt=0)
    min_order_value: float = Field(default=0, ge=0)
    max_discount: float | None = Field(default=None, gt=0)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    usage_limit: int | None = Field(default=None, ge=1)
    usage_limit_per_user: int | None = Field(default=None, ge=1)
    is_active: bool = True
    is_public: bool = True

    @model_validator(mode="after")
    def _check_window_and_value(self) -> AdminCouponBase:
        if self.starts_at and self.expires_at and self.starts_at >= self.expires_at:
            raise ValueError("expires_at must be after starts_at.")
        if self.discount_type is DiscountType.PERCENT and self.value > 100:
            raise ValueError("A percentage discount cannot exceed 100.")
        return self


class AdminCouponCreate(AdminCouponBase):
    code: str = Field(min_length=3, max_length=40, pattern=r"^[A-Za-z0-9_-]+$")


class AdminCouponUpdate(BaseModel):
    label: str | None = None
    description: str | None = None
    value: float | None = Field(default=None, gt=0)
    min_order_value: float | None = Field(default=None, ge=0)
    max_discount: float | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    usage_limit: int | None = None
    usage_limit_per_user: int | None = None
    is_active: bool | None = None
    is_public: bool | None = None


class AdminCouponRead(AdminCouponBase, ORMModel):
    id: int
    code: str
    times_used: int


class AdminOrderStatusUpdate(BaseModel):
    status: OrderStatus
    notify_customer: bool = True
