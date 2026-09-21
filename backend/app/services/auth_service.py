from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import AuthError, ConflictError
from app.core.security import (
    REFRESH_TOKEN,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import TokenPair, UserCreate


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def register(self, payload: UserCreate) -> User:
        email = payload.email.lower().strip()
        if self.users.get_by_email(email):
            raise ConflictError("An account with that email already exists.")
        user = User(
            email=email,
            full_name=payload.full_name.strip(),
            phone=payload.phone,
            hashed_password=hash_password(payload.password),
        )
        return self.users.create(user)

    def authenticate(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise AuthError("Incorrect email or password.")
        if not user.is_active:
            raise AuthError("This account has been deactivated.")
        return user

    @staticmethod
    def issue_tokens(user: User) -> TokenPair:
        return TokenPair(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id)),
        )

    def refresh(self, refresh_token: str) -> TokenPair:
        claims = decode_token(refresh_token, expected_type=REFRESH_TOKEN)
        if not claims:
            raise AuthError("Refresh token is invalid or has expired.")
        user = self.users.get(int(claims["sub"]))
        if not user or not user.is_active:
            raise AuthError("Refresh token is invalid or has expired.")
        return self.issue_tokens(user)
