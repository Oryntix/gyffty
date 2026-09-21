from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import DbSession, Pagination
from app.schemas.category import CategoryTree
from app.schemas.common import Page
from app.schemas.product import ProductCard, ProductDetail, ProductFacets, ProductFilters
from app.services.catalog_service import CatalogService

router = APIRouter()


def _filters(
    category: str | None = None,
    q: str | None = Query(default=None, description="Free-text search"),
    min_price: float | None = None,
    max_price: float | None = None,
    occasion: str | None = None,
    recipient: str | None = None,
    theme: str | None = None,
    customisable: bool | None = None,
    same_day: bool | None = None,
    luxe: bool | None = None,
    bestseller: bool | None = None,
    new_arrival: bool | None = None,
    min_rating: float | None = None,
    in_stock_only: bool = False,
    sort: str = "recommended",
) -> ProductFilters:
    return ProductFilters(
        category=category,
        q=q,
        min_price=min_price,
        max_price=max_price,
        occasion=occasion,
        recipient=recipient,
        theme=theme,
        customisable=customisable,
        same_day=same_day,
        luxe=luxe,
        bestseller=bestseller,
        new_arrival=new_arrival,
        min_rating=min_rating,
        in_stock_only=in_stock_only,
        sort=sort,
    )


Filters = Annotated[ProductFilters, Depends(_filters)]


@router.get("/categories", response_model=list[CategoryTree], tags=["catalog"])
def list_categories(db: DbSession) -> list[CategoryTree]:
    """The full navigation tree: pillars with their curated collections."""
    return CatalogService(db).category_tree()


@router.get("/categories/{slug}", response_model=CategoryTree, tags=["catalog"])
def get_category(slug: str, db: DbSession) -> CategoryTree:
    return CatalogService(db).get_category(slug)


@router.get("/products", response_model=Page[ProductCard], tags=["catalog"])
def list_products(db: DbSession, filters: Filters, page: Pagination) -> Page[ProductCard]:
    items, total = CatalogService(db).search(filters, limit=page.page_size, offset=page.offset)
    return Page.build(items, total, page.page, page.page_size)


@router.get("/products/facets", response_model=ProductFacets, tags=["catalog"])
def product_facets(db: DbSession, category: str | None = None) -> ProductFacets:
    """Filter-rail counts, scoped to a category when one is given."""
    return CatalogService(db).facets(category)


@router.get("/products/rails", response_model=dict[str, list[ProductCard]], tags=["catalog"])
def homepage_rails(db: DbSession) -> dict[str, list[ProductCard]]:
    """Everything the homepage carousels need, in one round trip."""
    return CatalogService(db).homepage_rails()


@router.get("/products/{slug}", response_model=ProductDetail, tags=["catalog"])
def get_product(slug: str, db: DbSession) -> ProductDetail:
    return CatalogService(db).get_product(slug)


@router.get("/products/{slug}/related", response_model=list[ProductCard], tags=["catalog"])
def related_products(slug: str, db: DbSession, limit: int = 8) -> list[ProductCard]:
    return CatalogService(db).related(slug, limit)
