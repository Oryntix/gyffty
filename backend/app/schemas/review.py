from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(default=None, max_length=160)
    body: str | None = Field(default=None, max_length=2000)


class ReviewRead(ORMModel):
    id: int
    rating: int
    title: str | None = None
    body: str | None = None
    is_verified_purchase: bool
    created_at: datetime
    author_name: str = "Guest"


class RatingSummary(BaseModel):
    average: float
    count: int
    distribution: dict[int, int]
