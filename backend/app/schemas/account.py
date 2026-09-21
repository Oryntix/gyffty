from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.product import ProductCard


class WishlistItemRead(BaseModel):
    id: int
    product: ProductCard
    created_at: datetime


class WishlistToggleResponse(BaseModel):
    product_id: int
    wishlisted: bool


class NewsletterSubscribeRequest(BaseModel):
    email: EmailStr
    source: str | None = Field(default=None, max_length=60)
