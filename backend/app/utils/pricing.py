"""Money.

Every total in the application is computed here, so the cart drawer, the
checkout summary and the persisted order can never disagree. Coupons live in the
database; this module only applies whatever discount it is handed.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.config import settings


@dataclass(frozen=True)
class Totals:
    subtotal: float
    discount_total: float
    shipping_fee: float
    tax_total: float
    grand_total: float
    amount_to_free_shipping: float

    def as_dict(self) -> dict[str, float]:
        return {
            "subtotal": self.subtotal,
            "discount_total": self.discount_total,
            "shipping_fee": self.shipping_fee,
            "tax_total": self.tax_total,
            "grand_total": self.grand_total,
            "amount_to_free_shipping": self.amount_to_free_shipping,
        }


def compute_totals(subtotal: float, *, discount: float = 0.0) -> Totals:
    """Order of operations, fixed in one place:

    discount comes off the subtotal, shipping is judged on the discounted
    amount, and GST applies to the discounted goods value only (not to shipping,
    which is invoiced separately in this model).
    """
    subtotal = round(max(subtotal, 0.0), 2)
    discount = round(min(max(discount, 0.0), subtotal), 2)
    taxable = round(subtotal - discount, 2)

    shipping = (
        0.0
        if taxable >= settings.FREE_SHIPPING_THRESHOLD or taxable == 0
        else settings.DEFAULT_SHIPPING_FEE
    )
    tax = round(taxable * settings.TAX_RATE, 2)
    grand = round(taxable + shipping + tax, 2)
    to_free = round(max(settings.FREE_SHIPPING_THRESHOLD - taxable, 0.0), 2)

    return Totals(
        subtotal=subtotal,
        discount_total=discount,
        shipping_fee=shipping,
        tax_total=tax,
        grand_total=grand,
        amount_to_free_shipping=to_free,
    )
