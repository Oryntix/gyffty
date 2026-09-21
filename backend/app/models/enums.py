"""Enumerations shared by models and schemas."""

from __future__ import annotations

from enum import StrEnum


class CategorySlug(StrEnum):
    """The four storefront pillars, plus the two occasion pillars under them."""

    CUSTOMISED = "customised"
    RELATIONSHIP = "relationship"
    FESTIVAL = "festival"
    ANNIVERSARY = "anniversary"
    BIRTHDAY = "birthday"


class DiscountType(StrEnum):
    PERCENT = "percent"
    FLAT = "flat"


class OrderStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PACKED = "packed"
    SHIPPED = "shipped"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class UserRole(StrEnum):
    CUSTOMER = "customer"
    STAFF = "staff"
    ADMIN = "admin"


class AddressType(StrEnum):
    HOME = "home"
    WORK = "work"
    OTHER = "other"
