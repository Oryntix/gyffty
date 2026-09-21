from __future__ import annotations

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import joinedload, selectinload

from app.models.category import Category
from app.models.product import Product
from app.repositories.base import BaseRepository
from app.schemas.product import ProductFilters, ProductSort

_SORT_CLAUSES = {
    ProductSort.PRICE_ASC: Product.price.asc(),
    ProductSort.PRICE_DESC: Product.price.desc(),
    ProductSort.NEWEST: Product.created_at.desc(),
    ProductSort.RATING: Product.rating_average.desc(),
    ProductSort.BESTSELLING: Product.sold_count.desc(),
}


class ProductRepository(BaseRepository[Product]):
    model = Product

    def _base_query(self) -> Select:
        return select(Product).where(Product.is_active.is_(True))

    def _apply_category(self, stmt: Select, slug: str) -> Select:
        """Match the pillar itself or any collection nested under it."""
        pillar_id = select(Category.id).where(Category.slug == slug).scalar_subquery()
        child_ids = select(Category.id).where(Category.parent_id == pillar_id)
        return stmt.where(or_(Product.category_id == pillar_id, Product.category_id.in_(child_ids)))

    def _apply_filters(self, stmt: Select, f: ProductFilters) -> Select:
        if f.category:
            stmt = self._apply_category(stmt, f.category)
        if f.q:
            like = f"%{f.q.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Product.name).like(like),
                    func.lower(func.coalesce(Product.short_description, "")).like(like),
                    func.lower(func.coalesce(Product.theme_tags, "")).like(like),
                    func.lower(func.coalesce(Product.occasion_tags, "")).like(like),
                )
            )
        if f.min_price is not None:
            stmt = stmt.where(Product.price >= f.min_price)
        if f.max_price is not None:
            stmt = stmt.where(Product.price <= f.max_price)
        if f.occasion:
            stmt = stmt.where(Product.occasion_tags.ilike(f"%{f.occasion}%"))
        if f.recipient:
            stmt = stmt.where(Product.recipient_tags.ilike(f"%{f.recipient}%"))
        if f.theme:
            stmt = stmt.where(Product.theme_tags.ilike(f"%{f.theme}%"))
        if f.customisable:
            stmt = stmt.where(Product.is_customisable.is_(True))
        if f.same_day:
            stmt = stmt.where(Product.same_day_delivery.is_(True))
        if f.luxe:
            stmt = stmt.where(Product.is_luxe.is_(True))
        if f.bestseller:
            stmt = stmt.where(Product.is_bestseller.is_(True))
        if f.new_arrival:
            stmt = stmt.where(Product.is_new_arrival.is_(True))
        if f.min_rating is not None:
            stmt = stmt.where(Product.rating_average >= f.min_rating)
        if f.in_stock_only:
            stmt = stmt.where(Product.stock_quantity > 0)
        return stmt

    def search(self, f: ProductFilters, *, limit: int, offset: int) -> tuple[list[Product], int]:
        stmt = self._apply_filters(self._base_query(), f)

        total = int(self.db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one())

        order = _SORT_CLAUSES.get(f.sort)
        if order is None:  # recommended
            stmt = stmt.order_by(
                Product.is_bestseller.desc(), Product.sold_count.desc(), Product.id.asc()
            )
        else:
            stmt = stmt.order_by(order)

        stmt = stmt.options(selectinload(Product.images)).limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars().unique()), total

    def get_by_slug(self, slug: str) -> Product | None:
        stmt = (
            select(Product)
            .where(Product.slug == slug, Product.is_active.is_(True))
            .options(
                selectinload(Product.images),
                selectinload(Product.inclusions),
                joinedload(Product.category),
            )
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def featured(self, flag: str, limit: int = 12) -> list[Product]:
        column = {
            "bestseller": Product.is_bestseller,
            "new_arrival": Product.is_new_arrival,
            "luxe": Product.is_luxe,
            "customisable": Product.is_customisable,
        }[flag]
        stmt = (
            self._base_query()
            .where(column.is_(True))
            .order_by(Product.sold_count.desc())
            .options(selectinload(Product.images))
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().unique())

    def featured_bundle(self, limit: int = 10) -> dict[str, list[Product]]:
        """Every homepage rail in one query.

        Four separate `featured()` calls meant four round trips plus four image
        loads. A product can appear on more than one rail, so fetching the union
        once and partitioning in Python is strictly less work.
        """
        stmt = (
            self._base_query()
            .where(
                or_(
                    Product.is_bestseller.is_(True),
                    Product.is_new_arrival.is_(True),
                    Product.is_luxe.is_(True),
                    Product.is_customisable.is_(True),
                )
            )
            .order_by(Product.sold_count.desc())
            .options(selectinload(Product.images))
        )
        rows = list(self.db.execute(stmt).scalars().unique())
        flags = {
            "bestsellers": "is_bestseller",
            "new_arrivals": "is_new_arrival",
            "luxe": "is_luxe",
            "customisable": "is_customisable",
        }
        return {rail: [p for p in rows if getattr(p, attr)][:limit] for rail, attr in flags.items()}

    def related(self, product: Product, limit: int = 8) -> list[Product]:
        stmt = (
            self._base_query()
            .where(Product.category_id == product.category_id, Product.id != product.id)
            .order_by(Product.sold_count.desc())
            .options(selectinload(Product.images))
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().unique())

    def facet_source(self, category_slug: str | None = None) -> list[tuple]:
        """One pass over the columns facets need, instead of one query per facet.

        Previously this loaded every Product ORM object three times (once per
        tag family) and ran a COUNT per price bucket — 16 round trips against a
        remote database. Now it is a single column-only scan and the counting
        happens in Python, where it is free.
        """
        stmt = select(
            Product.price,
            Product.occasion_tags,
            Product.recipient_tags,
            Product.theme_tags,
        ).where(Product.is_active.is_(True))
        if category_slug:
            stmt = self._apply_category(stmt, category_slug)
        return list(self.db.execute(stmt).all())

    def price_range(self, category_slug: str | None = None) -> tuple[float, float]:
        stmt = self._base_query()
        if category_slug:
            stmt = self._apply_filters(stmt, ProductFilters(category=category_slug))
        sub = stmt.subquery()
        row = self.db.execute(select(func.min(sub.c.price), func.max(sub.c.price))).one()
        return float(row[0] or 0), float(row[1] or 0)
