from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import ORMModel


class CategoryBase(BaseModel):
    name: str
    slug: str
    tagline: str | None = None
    description: str | None = None
    hero_image: str | None = None
    tile_image: str | None = None
    accent_color: str | None = None
    icon: str | None = None
    display_order: int = 0
    is_featured: bool = False


class CategoryCreate(CategoryBase):
    parent_id: int | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    tagline: str | None = None
    description: str | None = None
    hero_image: str | None = None
    tile_image: str | None = None
    accent_color: str | None = None
    display_order: int | None = None
    is_active: bool | None = None
    is_featured: bool | None = None


class CategoryRead(CategoryBase, ORMModel):
    id: int
    parent_id: int | None = None
    is_active: bool = True


class CategoryTree(CategoryRead):
    children: list[CategoryRead] = []
    product_count: int = 0
