from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.repositories.base import BaseRepository


class CartRepository(BaseRepository[Cart]):
    model = Cart

    def _loaded(self, stmt):
        """Cart, lines, products and images in a single round trip.

        selectinload would issue one query per level. A cart holds a handful of
        rows, so the wider JOIN is far cheaper than three extra round trips.
        """
        return stmt.options(
            joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.images)
        )

    def get_by_id_loaded(self, cart_id: int) -> Cart | None:
        """The cart with everything serialisation needs, in one query."""
        stmt = self._loaded(select(Cart).where(Cart.id == cart_id))
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def get_for_user(self, user_id: int) -> Cart | None:
        stmt = self._loaded(select(Cart).where(Cart.user_id == user_id))
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def get_for_session(self, token: str) -> Cart | None:
        stmt = self._loaded(select(Cart).where(Cart.session_token == token))
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def find_item(self, cart: Cart, product_id: int) -> CartItem | None:
        return next((i for i in cart.items if i.product_id == product_id), None)
