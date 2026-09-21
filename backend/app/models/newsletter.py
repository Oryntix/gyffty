from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base, PKMixin, TimestampMixin


class NewsletterSubscriber(Base, PKMixin, TimestampMixin):
    """An email address that asked to hear from us.

    Unsubscribing flips is_active rather than deleting the row, so a later
    re-subscribe is distinguishable from a first-time signup, and so we can
    prove consent if asked.
    """

    __tablename__ = "newsletter_subscribers"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Which part of the site captured it, for attribution.
    source: Mapped[str | None] = mapped_column(String(60))
