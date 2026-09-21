from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import CartToken, CurrentUser, DbSession
from app.core.config import settings
from app.core.ratelimit import rate_limit
from app.core.security import REFRESH_TOKEN, decode_token, revoke_token
from app.schemas.common import Message
from app.schemas.user import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    TokenPair,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.services.auth_service import AuthService
from app.services.cart_service import CartService

router = APIRouter(tags=["auth"])

# Credential endpoints get a much tighter ceiling than general traffic.
auth_limit = rate_limit("auth", lambda: settings.RATE_LIMIT_AUTH_PER_MINUTE, window_seconds=60)


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(auth_limit)],
)
def register(payload: UserCreate, db: DbSession) -> AuthResponse:
    service = AuthService(db)
    user = service.register(payload)
    return AuthResponse(user=UserRead.model_validate(user), tokens=service.issue_tokens(user))


@router.post("/login", response_model=AuthResponse, dependencies=[Depends(auth_limit)])
def login(payload: LoginRequest, db: DbSession, cart_token: CartToken) -> AuthResponse:
    service = AuthService(db)
    user = service.authenticate(payload.email, payload.password)
    if cart_token:
        CartService(db).merge_guest_cart(user_id=user.id, session_token=cart_token)
    return AuthResponse(user=UserRead.model_validate(user), tokens=service.issue_tokens(user))


@router.post("/refresh", response_model=TokenPair, dependencies=[Depends(auth_limit)])
def refresh(payload: RefreshRequest, db: DbSession) -> TokenPair:
    return AuthService(db).refresh(payload.refresh_token)


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)


@router.patch("/me", response_model=UserRead)
def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession) -> UserRead:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.post("/logout", response_model=Message)
def logout(payload: RefreshRequest, user: CurrentUser) -> Message:
    """Revoke the refresh token immediately rather than waiting for expiry.

    The short-lived access token is left to expire on its own; blocklisting
    every access token would mean a Redis read on every authenticated request.
    """
    claims = decode_token(payload.refresh_token, expected_type=REFRESH_TOKEN)
    if claims and claims.get("sub") == str(user.id):
        revoke_token(claims)
    return Message(message="Signed out.")
