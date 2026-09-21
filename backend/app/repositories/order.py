from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.enums import OrderStatus
from app.models.order import Order
from app.repositories.base import BaseRepository


class OrderRepository(BaseRepository[Order]):
    model = Order

    def get_by_number(self, order_number: str) -> Order | None:
        stmt = (
            select(Order)
            .where(Order.order_number == order_number)
            .options(selectinload(Order.items))
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def list_for_user(self, user_id: int, *, limit: int, offset: int) -> tuple[list[Order], int]:
        base = select(Order).where(Order.user_id == user_id)
        total = int(self.db.execute(select(func.count()).select_from(base.subquery())).scalar_one())
        stmt = (
            base.order_by(Order.created_at.desc())
            .options(selectinload(Order.items))
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().unique()), total

    def list_all(
        self, *, status: OrderStatus | None = None, limit: int, offset: int
    ) -> tuple[list[Order], int]:
        base = select(Order)
        if status is not None:
            base = base.where(Order.status == status)
        total = int(self.db.execute(select(func.count()).select_from(base.subquery())).scalar_one())
        stmt = (
            base.order_by(Order.created_at.desc())
            .options(selectinload(Order.items))
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().unique()), total
