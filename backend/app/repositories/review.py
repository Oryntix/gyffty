from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.models.review import Review
from app.repositories.base import BaseRepository


class ReviewRepository(BaseRepository[Review]):
    model = Review

    def list_for_product(
        self, product_id: int, *, limit: int, offset: int
    ) -> tuple[list[Review], int]:
        base = select(Review).where(Review.product_id == product_id, Review.is_published.is_(True))
        total = int(self.db.execute(select(func.count()).select_from(base.subquery())).scalar_one())
        stmt = (
            base.order_by(Review.created_at.desc())
            .options(joinedload(Review.user))
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().unique()), total

    def rating_summary(self, product_id: int) -> tuple[float, int, dict[int, int]]:
        rows = self.db.execute(
            select(Review.rating, func.count(Review.id))
            .where(Review.product_id == product_id, Review.is_published.is_(True))
            .group_by(Review.rating)
        ).all()
        distribution = {star: 0 for star in range(1, 6)}
        total = 0
        weighted = 0
        for rating, count in rows:
            distribution[int(rating)] = count
            total += count
            weighted += rating * count
        average = round(weighted / total, 2) if total else 0.0
        return average, total, distribution
