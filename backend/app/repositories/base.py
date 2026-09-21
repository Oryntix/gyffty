from __future__ import annotations

from typing import Any, Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.base_class import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Thin data-access wrapper. Services own the business rules; this owns the queries."""

    model: type[ModelT]

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, id_: int) -> ModelT | None:
        return self.db.get(self.model, id_)

    def get_by(self, **kwargs: Any) -> ModelT | None:
        stmt = select(self.model).filter_by(**kwargs).limit(1)
        return self.db.execute(stmt).scalar_one_or_none()

    def list(self, *, limit: int = 100, offset: int = 0, **filters: Any) -> list[ModelT]:
        stmt = select(self.model).filter_by(**filters).limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars())

    def count(self, **filters: Any) -> int:
        stmt = select(func.count()).select_from(self.model).filter_by(**filters)
        return int(self.db.execute(stmt).scalar_one())

    def create(self, obj: ModelT, *, commit: bool = True, refresh: bool = True) -> ModelT:
        """`refresh=False` skips re-reading a row we just wrote.

        The INSERT already returns the generated id, so the extra SELECT only
        buys server-side defaults — worth a round trip locally, not worth one
        against a remote database.
        """
        self.db.add(obj)
        if commit:
            self.db.commit()
            if refresh:
                self.db.refresh(obj)
        else:
            self.db.flush()
        return obj

    def update(self, obj: ModelT, data: dict[str, Any], *, commit: bool = True) -> ModelT:
        for key, value in data.items():
            if value is not None and hasattr(obj, key):
                setattr(obj, key, value)
        if commit:
            self.db.commit()
            self.db.refresh(obj)
        return obj

    def delete(self, obj: ModelT, *, commit: bool = True) -> None:
        self.db.delete(obj)
        if commit:
            self.db.commit()
