from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    account,
    admin,
    auth,
    cart,
    catalog,
    health,
    orders,
    reviews,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(catalog.router)
api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(cart.router, prefix="/cart")
api_router.include_router(orders.router, prefix="/orders")
# Reviews hang off the product resource: /products/{slug}/reviews
api_router.include_router(reviews.router, prefix="/products")
api_router.include_router(admin.router, prefix="/admin")
api_router.include_router(account.router)
