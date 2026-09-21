from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AuthError, PermissionError_
from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.common import PaginationParams

DbSession = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)
BearerCreds = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


def get_current_user(db: DbSession, creds: BearerCreds) -> User:
    if creds is None:
        raise AuthError("Sign in to continue.")
    claims = decode_token(creds.credentials)
    if not claims:
        raise AuthError("Your session has expired. Please sign in again.")
    user = UserRepository(db).get(int(claims["sub"]))
    if not user or not user.is_active:
        raise AuthError("Your session has expired. Please sign in again.")
    return user


def get_optional_user(db: DbSession, creds: BearerCreds) -> User | None:
    """For endpoints that serve guests and signed-in shoppers from one handler."""
    if creds is None:
        return None
    claims = decode_token(creds.credentials)
    if not claims:
        return None
    return UserRepository(db).get(int(claims["sub"]))


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role not in (UserRole.ADMIN, UserRole.STAFF):
        raise PermissionError_("This area is for store staff only.")
    return user


def get_pagination(page: int = 1, page_size: int = 24) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)


def get_cart_token(x_cart_token: Annotated[str | None, Header()] = None) -> str | None:
    """Guest carts are keyed by an opaque token the client keeps in local storage."""
    return x_cart_token


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
AdminUser = Annotated[User, Depends(require_admin)]
Pagination = Annotated[PaginationParams, Depends(get_pagination)]
CartToken = Annotated[str | None, Depends(get_cart_token)]
