from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.category import Category
from app.models.product import Product
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    model = Category

    def get_by_slug(self, slug: str) -> Category | None:
        stmt = (
            select(Category)
            .where(Category.slug == slug, Category.is_active.is_(True))
            .options(selectinload(Category.children))
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def pillars(self) -> list[Category]:
        stmt = (
            select(Category)
            .where(Category.parent_id.is_(None), Category.is_active.is_(True))
            .order_by(Category.display_order)
            .options(selectinload(Category.children))
        )
        return list(self.db.execute(stmt).scalars().unique())

    def product_counts(self) -> dict[int, int]:
        stmt = (
            select(Product.category_id, func.count(Product.id))
            .where(Product.is_active.is_(True))
            .group_by(Product.category_id)
        )
        return {row[0]: row[1] for row in self.db.execute(stmt)}
