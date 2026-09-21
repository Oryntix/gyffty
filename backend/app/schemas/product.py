from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field, computed_field

from app.schemas.category import CategoryRead
from app.schemas.common import ORMModel


class ProductSort(StrEnum):
    RECOMMENDED = "recommended"
    PRICE_ASC = "price_asc"
    PRICE_DESC = "price_desc"
    NEWEST = "newest"
    RATING = "rating"
    BESTSELLING = "bestselling"


class ProductImageRead(ORMModel):
    id: int
    url: str
    alt_text: str | None = None
    display_order: int = 0
    is_primary: bool = False


class ProductInclusionRead(ORMModel):
    id: int
    name: str
    quantity: str | None = None
    note: str | None = None


class ProductBase(BaseModel):
    name: str
    short_description: str | None = None
    description: str | None = None
    price: float = Field(gt=0)
    compare_at_price: float | None = Field(default=None, gt=0)
    category_id: int
    occasion_tags: str | None = None
    recipient_tags: str | None = None
    theme_tags: str | None = None
    is_customisable: bool = False
    allows_message_card: bool = True
    allows_engraving: bool = False
    stock_quantity: int = Field(default=0, ge=0)
    is_bestseller: bool = False
    is_new_arrival: bool = False
    is_luxe: bool = False
    same_day_delivery: bool = False


class ProductCreate(ProductBase):
    sku: str
    slug: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    short_description: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    compare_at_price: float | None = None
    category_id: int | None = None
    stock_quantity: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    is_bestseller: bool | None = None
    is_new_arrival: bool | None = None
    is_luxe: bool | None = None


class ProductCard(ORMModel):
    """Trimmed payload for grids and carousels."""

    id: int
    sku: str
    name: str
    slug: str
    short_description: str | None = None
    price: float
    compare_at_price: float | None = None
    currency: str = "INR"
    rating_average: float = 0.0
    rating_count: int = 0
    is_bestseller: bool = False
    is_new_arrival: bool = False
    is_luxe: bool = False
    is_customisable: bool = False
    same_day_delivery: bool = False
    stock_quantity: int = 0
    images: list[ProductImageRead] = []

    @computed_field
    @property
    def discount_percent(self) -> int:
        if not self.compare_at_price or self.compare_at_price <= self.price:
            return 0
        return round((self.compare_at_price - self.price) / self.compare_at_price * 100)

    @computed_field
    @property
    def in_stock(self) -> bool:
        return self.stock_quantity > 0

    @computed_field
    @property
    def primary_image(self) -> str | None:
        if not self.images:
            return None
        for image in self.images:
            if image.is_primary:
                return image.url
        return self.images[0].url


class ProductDetail(ProductCard):
    description: str | None = None
    category: CategoryRead | None = None
    occasion_tags: str | None = None
    recipient_tags: str | None = None
    theme_tags: str | None = None
    allows_message_card: bool = True
    allows_engraving: bool = False
    inclusions: list[ProductInclusionRead] = []
    seo_title: str | None = None
    seo_description: str | None = None


class ProductFilters(BaseModel):
    """Query facets for the listing page, mirroring the filter rail in the UI."""

    category: str | None = None
    q: str | None = None
    min_price: float | None = Field(default=None, ge=0)
    max_price: float | None = Field(default=None, ge=0)
    occasion: str | None = None
    recipient: str | None = None
    theme: str | None = None
    customisable: bool | None = None
    same_day: bool | None = None
    luxe: bool | None = None
    bestseller: bool | None = None
    new_arrival: bool | None = None
    min_rating: float | None = Field(default=None, ge=0, le=5)
    in_stock_only: bool = False
    sort: ProductSort = ProductSort.RECOMMENDED


class PriceBucket(BaseModel):
    label: str
    min_price: float
    max_price: float | None
    count: int


class FacetValue(BaseModel):
    value: str
    label: str
    count: int


class ProductFacets(BaseModel):
    price_buckets: list[PriceBucket] = []
    occasions: list[FacetValue] = []
    recipients: list[FacetValue] = []
    themes: list[FacetValue] = []
