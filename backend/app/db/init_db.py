"""Create the schema and load the demo catalogue.

python -m app.db.init_db          # create tables + seed if empty
python -m app.db.init_db --reset  # drop everything first
"""

from __future__ import annotations

import argparse
import random

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.base import Base
from app.db.seed.catalog_data import CATEGORIES, COUPONS, PRODUCTS, REVIEW_SAMPLES
from app.db.session import SessionLocal, engine
from app.models.category import Category
from app.models.coupon import Coupon
from app.models.enums import DiscountType, UserRole
from app.models.product import Product, ProductImage, ProductInclusion
from app.models.review import Review
from app.models.user import User
from app.utils.slug import make_slug

IMAGE_BASE = "https://picsum.photos/seed"
IMAGES_PER_PRODUCT = 4

DEMO_USERS = [
    ("admin@gyffty.com", "Gyffty Admin", UserRole.ADMIN),
    ("priya@example.com", "Priya Nair", UserRole.CUSTOMER),
    ("arjun@example.com", "Arjun Mehta", UserRole.CUSTOMER),
    ("sara@example.com", "Sara Qureshi", UserRole.CUSTOMER),
    ("dev@example.com", "Dev Kapoor", UserRole.CUSTOMER),
    ("meera@example.com", "Meera Iyer", UserRole.CUSTOMER),
]
DEMO_PASSWORD = "Gyffty@2026"


def _image_url(slug: str, index: int, w: int = 900, h: int = 1125) -> str:
    return f"{IMAGE_BASE}/{slug}-{index}/{w}/{h}"


def seed_categories(db: Session) -> dict[str, Category]:
    lookup: dict[str, Category] = {}
    for order, pillar in enumerate(CATEGORIES, start=1):
        children = pillar.pop("children", [])
        parent = Category(
            name=pillar["name"],
            slug=pillar["slug"],
            tagline=pillar.get("tagline"),
            description=pillar.get("description"),
            accent_color=pillar.get("accent_color"),
            icon=pillar.get("icon"),
            display_order=pillar.get("display_order", order),
            is_featured=pillar.get("is_featured", True),
            hero_image=_image_url(f"hero-{pillar['slug']}", 1, 1920, 900),
            tile_image=_image_url(f"tile-{pillar['slug']}", 1, 800, 800),
        )
        db.add(parent)
        db.flush()
        lookup[parent.slug] = parent

        for child_order, child in enumerate(children, start=1):
            node = Category(
                name=child["name"],
                slug=child["slug"],
                parent_id=parent.id,
                display_order=child_order,
                accent_color=parent.accent_color,
                tile_image=_image_url(f"tile-{child['slug']}", 1, 600, 600),
            )
            db.add(node)
            db.flush()
            lookup[node.slug] = node

    db.commit()
    return lookup


def seed_products(db: Session, categories: dict[str, Category]) -> list[Product]:
    created: list[Product] = []
    for index, record in enumerate(PRODUCTS, start=1):
        data = dict(record)
        inclusions = data.pop("inclusions", [])
        category = categories[data.pop("category")]
        slug = make_slug(data["name"])

        product = Product(
            sku=f"GYF-{index:04d}",
            slug=slug,
            category_id=category.id,
            seo_title=f"{data['name']} | Gyffty Hampers",
            seo_description=data.get("short_description"),
            **data,
        )
        for image_index in range(1, IMAGES_PER_PRODUCT + 1):
            product.images.append(
                ProductImage(
                    url=_image_url(slug, image_index),
                    alt_text=f"{product.name}, view {image_index}",
                    display_order=image_index,
                    is_primary=image_index == 1,
                )
            )
        for inclusion_index, inclusion in enumerate(inclusions, start=1):
            product.inclusions.append(
                ProductInclusion(
                    name=inclusion["name"],
                    quantity=inclusion.get("quantity"),
                    note=inclusion.get("note"),
                    display_order=inclusion_index,
                )
            )
        db.add(product)
        created.append(product)

    db.commit()
    return created


def seed_coupons(db: Session) -> list[Coupon]:
    coupons = [
        Coupon(**{**record, "discount_type": DiscountType(record["discount_type"])})
        for record in COUPONS
    ]
    db.add_all(coupons)
    db.commit()
    return coupons


def seed_users(db: Session) -> list[User]:
    users = [
        User(
            email=email,
            full_name=name,
            role=role,
            hashed_password=hash_password(DEMO_PASSWORD),
            is_verified=True,
        )
        for email, name, role in DEMO_USERS
    ]
    db.add_all(users)
    db.commit()
    return users


def seed_reviews(db: Session, products: list[Product], users: list[User]) -> None:
    rng = random.Random(42)
    customers = [u for u in users if u.role == UserRole.CUSTOMER]
    for product in products:
        for user in rng.sample(customers, k=rng.randint(1, min(3, len(customers)))):
            rating, title, body = rng.choice(REVIEW_SAMPLES)
            db.add(
                Review(
                    product_id=product.id,
                    user_id=user.id,
                    rating=rating,
                    title=title,
                    body=body,
                    is_verified_purchase=True,
                )
            )
    db.commit()


def main(reset: bool = False) -> None:
    if reset:
        Base.metadata.drop_all(bind=engine)
        print("Dropped all tables.")
    Base.metadata.create_all(bind=engine)
    print("Schema is up to date.")

    with SessionLocal() as db:
        if db.query(Category).count():
            print("Catalogue already seeded, nothing to do. Use --reset to rebuild.")
            return
        categories = seed_categories(db)
        products = seed_products(db, categories)
        users = seed_users(db)
        coupons = seed_coupons(db)
        seed_reviews(db, products, users)
        print(
            f"Seeded {len(categories)} categories, {len(products)} products, "
            f"{len(users)} users, {len(coupons)} coupons."
        )
        print(f"Demo sign-in: priya@example.com / {DEMO_PASSWORD}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialise the Gyffty database.")
    parser.add_argument("--reset", action="store_true", help="drop all tables first")
    main(**vars(parser.parse_args()))
