"""Wishlist and newsletter — the two pieces of storefront UI that had no API.

The wishlist model existed but was never exposed, so the heart on a product
card was decorative: it forgot the moment you reloaded.
"""

from __future__ import annotations

from fastapi import APIRouter, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.newsletter import NewsletterSubscriber
from app.models.product import Product
from app.models.wishlist import WishlistItem
from app.schemas.account import (
    NewsletterSubscribeRequest,
    WishlistItemRead,
    WishlistToggleResponse,
)
from app.schemas.common import Message
from app.schemas.product import ProductCard

router = APIRouter(tags=["account"])
log = get_logger(__name__)


# ----------------------------------------------------------------- wishlist --


@router.get("/wishlist", response_model=list[WishlistItemRead])
def list_wishlist(db: DbSession, user: CurrentUser) -> list[WishlistItemRead]:
    stmt = (
        select(WishlistItem)
        .where(WishlistItem.user_id == user.id)
        .options(selectinload(WishlistItem.product).selectinload(Product.images))
        .order_by(WishlistItem.created_at.desc())
    )
    return [
        WishlistItemRead(
            id=row.id,
            product=ProductCard.model_validate(row.product),
            created_at=row.created_at,
        )
        for row in db.execute(stmt).scalars().unique()
        if row.product is not None and row.product.is_active
    ]


@router.get("/wishlist/ids", response_model=list[int])
def wishlist_product_ids(db: DbSession, user: CurrentUser) -> list[int]:
    """Just the ids, so a product grid can fill in every heart in one request."""
    stmt = select(WishlistItem.product_id).where(WishlistItem.user_id == user.id)
    return list(db.execute(stmt).scalars())


@router.post("/wishlist/{product_id}", response_model=WishlistToggleResponse)
def toggle_wishlist(product_id: int, db: DbSession, user: CurrentUser) -> WishlistToggleResponse:
    """Idempotent toggle: tapping the heart twice leaves no trace either way."""
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise NotFoundError("That hamper is no longer available.")

    existing = db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == user.id, WishlistItem.product_id == product_id
        )
    ).scalar_one_or_none()

    if existing:
        db.delete(existing)
        db.commit()
        return WishlistToggleResponse(product_id=product_id, wishlisted=False)

    db.add(WishlistItem(user_id=user.id, product_id=product_id))
    try:
        db.commit()
    except IntegrityError:
        # Two rapid taps raced; the unique constraint held, so it is already saved.
        db.rollback()
    return WishlistToggleResponse(product_id=product_id, wishlisted=True)


@router.delete("/wishlist/{product_id}", response_model=Message)
def remove_from_wishlist(product_id: int, db: DbSession, user: CurrentUser) -> Message:
    existing = db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == user.id, WishlistItem.product_id == product_id
        )
    ).scalar_one_or_none()
    if existing is None:
        raise NotFoundError("That hamper is not in your wishlist.")
    db.delete(existing)
    db.commit()
    return Message(message="Removed from your wishlist.")


# --------------------------------------------------------------- newsletter --


@router.post(
    "/newsletter/subscribe",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
)
def subscribe(payload: NewsletterSubscribeRequest, db: DbSession) -> Message:
    """Re-subscribing, or subscribing twice, is deliberately not an error: the
    shopper's intent is the same either way and a duplicate warning helps nobody."""
    email = str(payload.email).lower().strip()
    existing = db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
    ).scalar_one_or_none()

    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
        return Message(message="You are on the list.")

    db.add(NewsletterSubscriber(email=email, source=payload.source))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    log.info("newsletter.subscribed", source=payload.source)
    return Message(message="You are on the list.")


@router.post("/newsletter/unsubscribe", response_model=Message)
def unsubscribe(payload: NewsletterSubscribeRequest, db: DbSession) -> Message:
    email = str(payload.email).lower().strip()
    existing = db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
    ).scalar_one_or_none()
    if existing:
        existing.is_active = False
        db.commit()
    # Never reveal whether an address was on the list.
    return Message(message="You will not hear from us again.")
