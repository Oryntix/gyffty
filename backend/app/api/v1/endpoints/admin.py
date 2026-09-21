"""Staff-only operations. Every route here requires an admin or staff token."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import AdminUser, DbSession, Pagination
from app.core.cache import invalidate_catalogue
from app.core.exceptions import ConflictError, NotFoundError
from app.models.coupon import Coupon
from app.models.enums import OrderStatus
from app.repositories.coupon import CouponRepository
from app.repositories.order import OrderRepository
from app.schemas.admin import (
    AdminCouponCreate,
    AdminCouponRead,
    AdminCouponUpdate,
    AdminOrderStatusUpdate,
)
from app.schemas.common import Message, Page
from app.schemas.order import OrderRead
from app.services.email_service import send_order_shipped
from app.services.order_service import OrderService

router = APIRouter(tags=["admin"])


# ------------------------------------------------------------------ coupons --


@router.get("/coupons", response_model=list[AdminCouponRead])
def list_coupons(db: DbSession, _: AdminUser) -> list[AdminCouponRead]:
    repo = CouponRepository(db)
    return [AdminCouponRead.model_validate(c) for c in repo.list(limit=200)]


@router.post("/coupons", response_model=AdminCouponRead, status_code=status.HTTP_201_CREATED)
def create_coupon(payload: AdminCouponCreate, db: DbSession, _: AdminUser) -> AdminCouponRead:
    repo = CouponRepository(db)
    code = payload.code.upper().strip()
    if repo.get_by_code(code):
        raise ConflictError(f"Coupon {code} already exists.")
    coupon = repo.create(Coupon(**{**payload.model_dump(), "code": code}))
    return AdminCouponRead.model_validate(coupon)


@router.patch("/coupons/{code}", response_model=AdminCouponRead)
def update_coupon(
    code: str, payload: AdminCouponUpdate, db: DbSession, _: AdminUser
) -> AdminCouponRead:
    repo = CouponRepository(db)
    coupon = repo.get_by_code(code)
    if not coupon:
        raise NotFoundError(f"No coupon with code {code}.")
    # exclude_unset so a PATCH can deliberately set is_active to false.
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(coupon, key, value)
    db.commit()
    db.refresh(coupon)
    return AdminCouponRead.model_validate(coupon)


@router.delete("/coupons/{code}", response_model=Message)
def deactivate_coupon(code: str, db: DbSession, _: AdminUser) -> Message:
    """Deactivates rather than deletes, so historic orders keep a valid code."""
    repo = CouponRepository(db)
    coupon = repo.get_by_code(code)
    if not coupon:
        raise NotFoundError(f"No coupon with code {code}.")
    coupon.is_active = False
    db.commit()
    return Message(message=f"Coupon {coupon.code} deactivated.")


# ------------------------------------------------------------------- orders --


@router.get("/orders", response_model=Page[OrderRead])
def list_orders(
    db: DbSession, _: AdminUser, page: Pagination, order_status: OrderStatus | None = None
) -> Page[OrderRead]:
    rows, total = OrderRepository(db).list_all(
        status=order_status, limit=page.page_size, offset=page.offset
    )
    return Page.build([OrderRead.model_validate(o) for o in rows], total, page.page, page.page_size)


@router.patch("/orders/{order_number}/status", response_model=OrderRead)
def set_order_status(
    order_number: str, payload: AdminOrderStatusUpdate, db: DbSession, _: AdminUser
) -> OrderRead:
    order = OrderService(db).update_status(order_number, payload.status)
    invalidate_catalogue()
    if payload.status is OrderStatus.SHIPPED and payload.notify_customer:
        send_order_shipped(order)
    return order
