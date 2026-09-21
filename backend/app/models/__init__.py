"""Importing any model pulls in all of them, so the SQLAlchemy registry is
always complete no matter which module the request path happens to touch first.
"""

from app.models.address import Address
from app.models.cart import Cart, CartItem
from app.models.category import Category
from app.models.coupon import Coupon
from app.models.enums import (
    AddressType,
    CategorySlug,
    DiscountType,
    OrderStatus,
    PaymentStatus,
    UserRole,
)
from app.models.newsletter import NewsletterSubscriber
from app.models.order import Order, OrderItem
from app.models.product import Product, ProductImage, ProductInclusion
from app.models.review import Review
from app.models.user import User
from app.models.wishlist import WishlistItem

__all__ = [
    "Address",
    "AddressType",
    "Cart",
    "CartItem",
    "Category",
    "CategorySlug",
    "Coupon",
    "DiscountType",
    "NewsletterSubscriber",
    "Order",
    "OrderItem",
    "OrderStatus",
    "PaymentStatus",
    "Product",
    "ProductImage",
    "ProductInclusion",
    "Review",
    "User",
    "UserRole",
    "WishlistItem",
]
