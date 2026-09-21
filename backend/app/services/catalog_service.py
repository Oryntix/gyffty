from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.cache import get_or_set
from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.models.product import Product
from app.repositories.category import CategoryRepository
from app.repositories.product import ProductRepository
from app.schemas.category import CategoryRead, CategoryTree
from app.schemas.product import (
    FacetValue,
    PriceBucket,
    ProductCard,
    ProductDetail,
    ProductFacets,
    ProductFilters,
)

# Mirrors the "Shop by budget" rail lifted from the reference storefronts.
PRICE_BUCKETS: list[tuple[str, float, float | None]] = [
    ("Under 1500", 0, 1500),
    ("1500 to 3000", 1500, 3000),
    ("3000 to 5000", 3000, 5000),
    ("5000 to 7500", 5000, 7500),
    ("7500 and above", 7500, None),
]


def _humanise(tag: str) -> str:
    return tag.replace("-", " ").replace("_", " ").title()


class CatalogService:
    def __init__(self, db: Session) -> None:
        self.products = ProductRepository(db)
        self.categories = CategoryRepository(db)

    # ---- categories -------------------------------------------------
    def category_tree(self) -> list[CategoryTree]:
        """Cached: the navigation tree is identical for every visitor and is
        requested on literally every page."""
        return get_or_set("categories:tree", self._build_category_tree)

    def _build_category_tree(self) -> list[CategoryTree]:
        counts = self.categories.product_counts()
        tree: list[CategoryTree] = []
        for pillar in self.categories.pillars():
            children = sorted(pillar.children, key=lambda c: c.display_order)
            total = counts.get(pillar.id, 0) + sum(counts.get(c.id, 0) for c in children)
            node = CategoryTree.model_validate(pillar)
            node.children = [CategoryRead.model_validate(c) for c in children]
            node.product_count = total
            tree.append(node)
        return tree

    def get_category(self, slug: str) -> CategoryTree:
        return get_or_set(f"category:{slug}", lambda: self._build_category(slug))

    def _build_category(self, slug: str) -> CategoryTree:
        category = self.categories.get_by_slug(slug)
        if not category:
            raise NotFoundError(f"No category with slug {slug}.")
        counts = self.categories.product_counts()
        children = sorted(category.children, key=lambda c: c.display_order)
        node = CategoryTree.model_validate(category)
        node.children = [CategoryRead.model_validate(c) for c in children]
        node.product_count = counts.get(category.id, 0) + sum(counts.get(c.id, 0) for c in children)
        return node

    # ---- products ---------------------------------------------------
    def search(
        self, filters: ProductFilters, *, limit: int, offset: int
    ) -> tuple[list[ProductCard], int]:
        """Listing pages are cached per filter combination.

        Stock is the one field that moves between requests, and a shopper is
        told the truth about it at add-to-cart and again at checkout, both of
        which read live. A count on a grid tile being a minute stale is not
        worth a database round trip on every page view.
        """
        key = f"search:{filters.model_dump_json()}:{limit}:{offset}"

        def build() -> tuple[list[ProductCard], int]:
            rows, total = self.products.search(filters, limit=limit, offset=offset)
            return [ProductCard.model_validate(p) for p in rows], total

        return get_or_set(key, build)

    def get_product(self, slug: str) -> ProductDetail:
        def build() -> ProductDetail:
            product = self.products.get_by_slug(slug)
            if not product:
                raise NotFoundError(f"No product with slug {slug}.")
            return ProductDetail.model_validate(product)

        return get_or_set(f"product:{slug}", build)

    def related(self, slug: str, limit: int = 8) -> list[ProductCard]:
        def build() -> list[ProductCard]:
            product = self.products.get_by_slug(slug)
            if not product:
                raise NotFoundError(f"No product with slug {slug}.")
            return [ProductCard.model_validate(p) for p in self.products.related(product, limit)]

        return get_or_set(f"related:{slug}:{limit}", build)

    def featured(self, flag: str, limit: int = 12) -> list[ProductCard]:
        return [ProductCard.model_validate(p) for p in self.products.featured(flag, limit)]

    def homepage_rails(self) -> dict[str, list[ProductCard]]:
        """Four carousels, cached as one entry: the homepage is the most
        requested page on the site and none of this is per-visitor."""
        return get_or_set(
            "rails:home",
            lambda: {
                rail: [ProductCard.model_validate(p) for p in products]
                for rail, products in self.products.featured_bundle(10).items()
            },
        )

    # ---- facets -----------------------------------------------------
    def facets(self, category_slug: str | None = None) -> ProductFacets:
        """Filter-rail counts.

        Cached, because every visitor to a listing page gets the same answer
        and the underlying scan is the most expensive read in the catalogue.
        """

        def build() -> ProductFacets:
            rows = self.products.facet_source(category_slug)

            buckets: list[PriceBucket] = []
            for label, low, high in PRICE_BUCKETS:
                count = sum(
                    1 for price, *_ in rows if price >= low and (high is None or price <= high)
                )
                buckets.append(PriceBucket(label=label, min_price=low, max_price=high, count=count))

            def tally(index: int) -> list[FacetValue]:
                counts: dict[str, int] = {}
                for row in rows:
                    for tag in (t.strip() for t in (row[index] or "").split(",")):
                        if tag:
                            counts[tag] = counts.get(tag, 0) + 1
                return [
                    FacetValue(value=tag, label=_humanise(tag), count=n)
                    for tag, n in sorted(counts.items(), key=lambda kv: -kv[1])
                ]

            return ProductFacets(
                price_buckets=buckets,
                occasions=tally(1),
                recipients=tally(2),
                themes=tally(3),
            )

        return get_or_set(f"facets:{category_slug or 'all'}", build)

    @staticmethod
    def currency() -> str:
        return settings.CURRENCY

    @staticmethod
    def to_card(product: Product) -> ProductCard:
        return ProductCard.model_validate(product)
