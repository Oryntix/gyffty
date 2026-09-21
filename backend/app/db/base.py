"""Import every model so Alembic/metadata sees them."""

from app.db.base_class import Base  # noqa: F401
from app.models.address import Address  # noqa: F401
from app.models.cart import Cart, CartItem  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.coupon import Coupon  # noqa: F401
from app.models.newsletter import NewsletterSubscriber  # noqa: F401
from app.models.order import Order, OrderItem  # noqa: F401
from app.models.product import Product, ProductImage, ProductInclusion  # noqa: F401
from app.models.review import Review  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.wishlist import WishlistItem  # noqa: F401
