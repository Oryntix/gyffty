from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession, Pagination
from app.schemas.common import Page
from app.schemas.review import RatingSummary, ReviewCreate, ReviewRead
from app.services.review_service import ReviewService

router = APIRouter(tags=["reviews"])


@router.get("/{slug}/reviews", response_model=Page[ReviewRead])
def list_reviews(slug: str, db: DbSession, page: Pagination) -> Page[ReviewRead]:
    items, total = ReviewService(db).list_for_product(
        slug, limit=page.page_size, offset=page.offset
    )
    return Page.build(items, total, page.page, page.page_size)


@router.get("/{slug}/reviews/summary", response_model=RatingSummary)
def review_summary(slug: str, db: DbSession) -> RatingSummary:
    return ReviewService(db).summary(slug)


@router.post("/{slug}/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
def create_review(slug: str, payload: ReviewCreate, db: DbSession, user: CurrentUser) -> ReviewRead:
    return ReviewService(db).create(slug, user.id, payload)
