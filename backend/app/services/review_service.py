from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.cache import get_or_set, invalidate
from app.core.exceptions import ConflictError, NotFoundError
from app.models.review import Review
from app.repositories.product import ProductRepository
from app.repositories.review import ReviewRepository
from app.schemas.review import RatingSummary, ReviewCreate, ReviewRead


class ReviewService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.reviews = ReviewRepository(db)
        self.products = ProductRepository(db)

    def list_for_product(
        self, slug: str, *, limit: int, offset: int
    ) -> tuple[list[ReviewRead], int]:
        return get_or_set(
            f"reviews:list:{slug}:{limit}:{offset}",
            lambda: self._build_list(slug, limit, offset),
        )

    def _build_list(self, slug: str, limit: int, offset: int) -> tuple[list[ReviewRead], int]:
        product = self.products.get_by_slug(slug)
        if not product:
            raise NotFoundError("We could not find that hamper.")
        rows, total = self.reviews.list_for_product(product.id, limit=limit, offset=offset)
        items = []
        for row in rows:
            read = ReviewRead.model_validate(row)
            read.author_name = row.user.full_name if row.user else "Guest"
            items.append(read)
        return items, total

    def summary(self, slug: str) -> RatingSummary:
        return get_or_set(f"reviews:summary:{slug}", lambda: self._build_summary(slug))

    def _build_summary(self, slug: str) -> RatingSummary:
        product = self.products.get_by_slug(slug)
        if not product:
            raise NotFoundError("We could not find that hamper.")
        average, count, distribution = self.reviews.rating_summary(product.id)
        return RatingSummary(average=average, count=count, distribution=distribution)

    def create(self, slug: str, user_id: int, payload: ReviewCreate) -> ReviewRead:
        product = self.products.get_by_slug(slug)
        if not product:
            raise NotFoundError("We could not find that hamper.")
        if self.reviews.get_by(product_id=product.id, user_id=user_id):
            raise ConflictError("You have already reviewed this hamper.")

        review = Review(
            product_id=product.id,
            user_id=user_id,
            rating=payload.rating,
            title=payload.title,
            body=payload.body,
        )
        self.db.add(review)
        self.db.flush()

        # Keep the denormalised aggregate on the product in step.
        average, count, _ = self.reviews.rating_summary(product.id)
        product.rating_average = average
        product.rating_count = count
        self.db.commit()
        self.db.refresh(review)

        # The product page must show a review the moment it is written.
        invalidate(f"reviews:summary:{slug}")
        invalidate(f"reviews:list:{slug}")
        invalidate(f"product:{slug}")

        read = ReviewRead.model_validate(review)
        read.author_name = review.user.full_name if review.user else "Guest"
        return read
