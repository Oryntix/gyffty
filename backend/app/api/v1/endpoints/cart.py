from __future__ import annotations

from fastapi import APIRouter, Response

from app.api.deps import CartToken, DbSession, OptionalUser
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartRead
from app.services.cart_service import CartService

router = APIRouter(tags=["cart"])


def _resolve(db, user, token: str | None, response: Response):
    """Return (service, cart). Mints a guest token when the caller has none."""
    service = CartService(db)
    if user is None and not token:
        token = service.new_session_token()
        response.headers["X-Cart-Token"] = token
    cart = service.resolve(user_id=user.id if user else None, session_token=token)
    return service, cart


@router.get("", response_model=CartRead)
def get_cart(
    db: DbSession,
    user: OptionalUser,
    cart_token: CartToken,
    response: Response,
    coupon: str | None = None,
) -> CartRead:
    service, cart = _resolve(db, user, cart_token, response)
    return service.to_schema(cart, coupon_code=coupon, user_id=user.id if user else None)


@router.post("/items", response_model=CartRead)
def add_item(
    payload: CartItemCreate,
    db: DbSession,
    user: OptionalUser,
    cart_token: CartToken,
    response: Response,
) -> CartRead:
    service, cart = _resolve(db, user, cart_token, response)
    return service.to_schema(service.add_item(cart, payload), user_id=user.id if user else None)


@router.patch("/items/{item_id}", response_model=CartRead)
def update_item(
    item_id: int,
    payload: CartItemUpdate,
    db: DbSession,
    user: OptionalUser,
    cart_token: CartToken,
    response: Response,
) -> CartRead:
    service, cart = _resolve(db, user, cart_token, response)
    return service.to_schema(
        service.update_item(cart, item_id, payload),
        user_id=user.id if user else None,
    )


@router.delete("/items/{item_id}", response_model=CartRead)
def remove_item(
    item_id: int,
    db: DbSession,
    user: OptionalUser,
    cart_token: CartToken,
    response: Response,
) -> CartRead:
    service, cart = _resolve(db, user, cart_token, response)
    return service.to_schema(service.remove_item(cart, item_id), user_id=user.id if user else None)


@router.delete("", response_model=CartRead)
def clear_cart(
    db: DbSession, user: OptionalUser, cart_token: CartToken, response: Response
) -> CartRead:
    service, cart = _resolve(db, user, cart_token, response)
    return service.to_schema(service.clear(cart), user_id=user.id if user else None)
