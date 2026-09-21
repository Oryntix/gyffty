from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import settings
from app.utils.pricing import compute_totals

API = "/api/v1"

ADDRESS = {
    "full_name": "Priya Nair",
    "phone": "9876543210",
    "line1": "12 Rose Villa, Lavelle Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560001",
}


def checkout_body(**overrides) -> dict:
    body = {
        "contact_email": "guest@example.com",
        "contact_phone": "9876543210",
        "shipping_address": ADDRESS,
    }
    body.update(overrides)
    return body


# ---------------------------------------------------------------- pricing ---


def test_free_shipping_kicks_in_at_the_threshold() -> None:
    below = compute_totals(settings.FREE_SHIPPING_THRESHOLD - 1)
    at = compute_totals(settings.FREE_SHIPPING_THRESHOLD)
    assert below.shipping_fee == settings.DEFAULT_SHIPPING_FEE
    assert at.shipping_fee == 0


def test_an_empty_cart_is_not_charged_shipping() -> None:
    assert compute_totals(0).shipping_fee == 0
    assert compute_totals(0).grand_total == 0


def test_tax_is_charged_on_the_discounted_amount() -> None:
    totals = compute_totals(5000, discount=500)
    assert totals.tax_total == round(4500 * settings.TAX_RATE, 2)
    assert totals.grand_total == round(4500 + totals.shipping_fee + totals.tax_total, 2)


def test_discount_can_never_exceed_the_subtotal() -> None:
    totals = compute_totals(1000, discount=99999)
    assert totals.discount_total == 1000
    assert totals.grand_total == 0


def test_negative_inputs_are_clamped() -> None:
    totals = compute_totals(-50, discount=-10)
    assert totals.subtotal == 0
    assert totals.discount_total == 0


# ---------------------------------------------------------------- coupons ---


def test_percentage_coupon_applies_above_its_minimum(client: TestClient) -> None:
    low = client.post(
        f"{API}/orders/coupons/preview", json={"code": "GYFFTY10", "subtotal": 1000}
    ).json()
    assert low["accepted"] is False
    assert "more" in (low["message"] or "")

    high = client.post(
        f"{API}/orders/coupons/preview", json={"code": "GYFFTY10", "subtotal": 5000}
    ).json()
    assert high["accepted"] is True
    assert high["discount"] == 500


def test_percentage_coupon_respects_its_cap(client: TestClient) -> None:
    """GYFFTY10 is 10% capped at 1500, so a huge order stops at the cap."""
    body = client.post(
        f"{API}/orders/coupons/preview", json={"code": "GYFFTY10", "subtotal": 100000}
    ).json()
    assert body["accepted"] is True
    assert body["discount"] == 1500


def test_flat_coupon(client: TestClient) -> None:
    body = client.post(
        f"{API}/orders/coupons/preview", json={"code": "WELCOME300", "subtotal": 3000}
    ).json()
    assert body["accepted"] is True
    assert body["discount"] == 300


def test_unknown_coupon_is_rejected_with_a_reason(client: TestClient) -> None:
    body = client.post(
        f"{API}/orders/coupons/preview", json={"code": "NOTREAL", "subtotal": 5000}
    ).json()
    assert body["accepted"] is False
    assert body["discount"] == 0
    assert body["message"]


def test_coupon_codes_are_case_insensitive(client: TestClient) -> None:
    body = client.post(
        f"{API}/orders/coupons/preview", json={"code": "gyffty10", "subtotal": 5000}
    ).json()
    assert body["accepted"] is True


def test_private_coupons_are_hidden_from_the_public_list(client: TestClient) -> None:
    codes = {c["code"] for c in client.get(f"{API}/orders/coupons").json()}
    assert "GYFFTY10" in codes
    assert "CORPORATE20" not in codes


# ------------------------------------------------------------------- auth ---


def test_register_rejects_a_duplicate_email(client: TestClient) -> None:
    response = client.post(
        f"{API}/auth/register",
        json={
            "email": "priya@example.com",
            "full_name": "Someone Else",
            "password": "Another@2026",
        },
    )
    assert response.status_code == 409


def test_register_rejects_a_short_password(client: TestClient) -> None:
    response = client.post(
        f"{API}/auth/register",
        json={"email": "new@example.com", "full_name": "New User", "password": "short"},
    )
    assert response.status_code == 422


def test_login_with_a_bad_password(client: TestClient) -> None:
    response = client.post(
        f"{API}/auth/login", json={"email": "priya@example.com", "password": "wrong"}
    )
    assert response.status_code == 401


def test_me_requires_a_token(client: TestClient) -> None:
    assert client.get(f"{API}/auth/me").status_code == 401


def test_a_garbage_token_is_rejected(client: TestClient) -> None:
    response = client.get(f"{API}/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"})
    assert response.status_code == 401


def test_refresh_rotates_and_logout_revokes(client: TestClient) -> None:
    login = client.post(
        f"{API}/auth/login",
        json={"email": "dev@example.com", "password": "Gyffty@2026"},
    ).json()
    refresh_token = login["tokens"]["refresh_token"]
    access = {"Authorization": f"Bearer {login['tokens']['access_token']}"}

    assert (
        client.post(f"{API}/auth/refresh", json={"refresh_token": refresh_token}).status_code == 200
    )

    assert (
        client.post(
            f"{API}/auth/logout", json={"refresh_token": refresh_token}, headers=access
        ).status_code
        == 200
    )

    # The revoked refresh token must no longer mint access tokens.
    assert (
        client.post(f"{API}/auth/refresh", json={"refresh_token": refresh_token}).status_code == 401
    )


def test_an_access_token_cannot_be_used_as_a_refresh_token(client: TestClient) -> None:
    login = client.post(
        f"{API}/auth/login",
        json={"email": "meera@example.com", "password": "Gyffty@2026"},
    ).json()
    response = client.post(
        f"{API}/auth/refresh",
        json={"refresh_token": login["tokens"]["access_token"]},
    )
    assert response.status_code == 401


# ------------------------------------------------------------------- cart ---


def test_guest_cart_is_issued_a_token(client: TestClient) -> None:
    response = client.post(f"{API}/cart/items", json={"product_id": 1, "quantity": 1})
    assert response.status_code == 200
    assert response.headers.get("X-Cart-Token")
    assert response.json()["item_count"] == 1


def test_adding_the_same_product_twice_merges_the_line(client: TestClient) -> None:
    first = client.post(f"{API}/cart/items", json={"product_id": 2, "quantity": 1})
    headers = {"X-Cart-Token": first.headers["X-Cart-Token"]}

    client.post(f"{API}/cart/items", json={"product_id": 2, "quantity": 2}, headers=headers)
    body = client.get(f"{API}/cart", headers=headers).json()

    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 3


def test_cart_totals_reflect_a_coupon(client: TestClient) -> None:
    response = client.post(f"{API}/cart/items", json={"product_id": 3, "quantity": 3})
    headers = {"X-Cart-Token": response.headers["X-Cart-Token"]}
    body = client.get(f"{API}/cart", params={"coupon": "GYFFTY10"}, headers=headers).json()
    assert body["coupon_code"] == "GYFFTY10"
    assert body["totals"]["discount_total"] > 0


def test_an_invalid_cart_coupon_prices_at_full_value(client: TestClient) -> None:
    response = client.post(f"{API}/cart/items", json={"product_id": 3, "quantity": 1})
    headers = {"X-Cart-Token": response.headers["X-Cart-Token"]}
    body = client.get(f"{API}/cart", params={"coupon": "NOPE"}, headers=headers).json()
    assert body["coupon_code"] is None
    assert body["coupon_message"]
    assert body["totals"]["discount_total"] == 0


def test_engraving_is_rejected_on_a_product_that_cannot_be_engraved(
    client: TestClient,
) -> None:
    detail = client.get(f"{API}/products/sunday-morning-hamper").json()
    assert detail["allows_engraving"] is False
    response = client.post(
        f"{API}/cart/items",
        json={"product_id": detail["id"], "quantity": 1, "engraving_text": "ABC"},
    )
    assert response.status_code == 422


def test_cannot_add_more_than_stock(client: TestClient) -> None:
    detail = client.get(f"{API}/products/luxe-birthday-grand-hamper").json()
    response = client.post(f"{API}/cart/items", json={"product_id": detail["id"], "quantity": 999})
    assert response.status_code == 422


# --------------------------------------------------------------- checkout ---


def test_checkout_creates_an_order_and_empties_the_cart(client: TestClient) -> None:
    added = client.post(f"{API}/cart/items", json={"product_id": 5, "quantity": 2})
    headers = {"X-Cart-Token": added.headers["X-Cart-Token"]}

    response = client.post(
        f"{API}/orders/checkout", headers=headers, json=checkout_body(delivery_slot="9am - 1pm")
    )
    assert response.status_code == 201, response.text
    body = response.json()
    order = body["order"]

    assert order["order_number"].startswith("GYF-")
    assert order["status"] == "pending"
    assert order["payment_status"] == "pending"
    assert len(order["items"]) == 1
    assert order["grand_total"] > 0

    # A payment intent comes back so the storefront can open the gateway.
    assert body["payment"]["provider"] == "mock"
    assert body["payment"]["amount_minor"] == round(order["grand_total"] * 100)

    assert client.get(f"{API}/cart", headers=headers).json()["item_count"] == 0
    assert client.get(f"{API}/orders/{order['order_number']}").status_code == 200


def test_checkout_with_an_empty_cart_is_rejected(client: TestClient) -> None:
    headers = {"X-Cart-Token": "brand-new-token-abc"}
    assert client.get(f"{API}/cart", headers=headers).json()["item_count"] == 0
    response = client.post(f"{API}/orders/checkout", headers=headers, json=checkout_body())
    assert response.status_code == 422


def test_checkout_rejects_an_invalid_coupon(client: TestClient) -> None:
    added = client.post(f"{API}/cart/items", json={"product_id": 4, "quantity": 1})
    headers = {"X-Cart-Token": added.headers["X-Cart-Token"]}
    response = client.post(
        f"{API}/orders/checkout", headers=headers, json=checkout_body(coupon_code="FAKECODE")
    )
    assert response.status_code == 422


def test_checkout_decrements_stock(client: TestClient) -> None:
    before = client.get(f"{API}/products/movie-night-in-a-box").json()
    added = client.post(f"{API}/cart/items", json={"product_id": before["id"], "quantity": 2})
    client.post(
        f"{API}/orders/checkout",
        headers={"X-Cart-Token": added.headers["X-Cart-Token"]},
        json=checkout_body(),
    )
    after = client.get(f"{API}/products/movie-night-in-a-box").json()
    assert after["stock_quantity"] == before["stock_quantity"] - 2


def test_checkout_records_the_coupon_and_discount(client: TestClient) -> None:
    added = client.post(f"{API}/cart/items", json={"product_id": 12, "quantity": 2})
    headers = {"X-Cart-Token": added.headers["X-Cart-Token"]}
    order = client.post(
        f"{API}/orders/checkout", headers=headers, json=checkout_body(coupon_code="GYFFTY10")
    ).json()["order"]
    assert order["coupon_code"] == "GYFFTY10"
    assert order["discount_total"] > 0


def test_signed_in_order_appears_in_order_history(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    client.post(f"{API}/cart/items", json={"product_id": 7, "quantity": 1}, headers=auth_headers)
    placed = client.post(
        f"{API}/orders/checkout",
        headers=auth_headers,
        json=checkout_body(contact_email="priya@example.com"),
    )
    assert placed.status_code == 201
    order_number = placed.json()["order"]["order_number"]

    history = client.get(f"{API}/orders", headers=auth_headers).json()
    assert order_number in {o["order_number"] for o in history["items"]}


def test_another_customers_order_is_not_readable(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    client.post(f"{API}/cart/items", json={"product_id": 8, "quantity": 1}, headers=auth_headers)
    order_number = client.post(
        f"{API}/orders/checkout",
        headers=auth_headers,
        json=checkout_body(contact_email="priya@example.com"),
    ).json()["order"]["order_number"]

    other = client.post(
        f"{API}/auth/login",
        json={"email": "sara@example.com", "password": "Gyffty@2026"},
    ).json()
    headers = {"Authorization": f"Bearer {other['tokens']['access_token']}"}
    assert client.get(f"{API}/orders/{order_number}", headers=headers).status_code == 404


# --------------------------------------------------------------- payments ---


def test_payment_confirm_marks_the_order_paid(client: TestClient) -> None:
    added = client.post(f"{API}/cart/items", json={"product_id": 9, "quantity": 1})
    body = client.post(
        f"{API}/orders/checkout",
        headers={"X-Cart-Token": added.headers["X-Cart-Token"]},
        json=checkout_body(),
    ).json()
    order_number = body["order"]["order_number"]
    intent_id = body["payment"]["intent_id"]

    confirmed = client.post(
        f"{API}/orders/payment/confirm",
        json={"order_number": order_number, "payload": {"intent_id": intent_id}},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["payment_status"] == "paid"
    assert confirmed.json()["status"] == "confirmed"


def test_payment_confirm_rejects_an_unverifiable_payload(client: TestClient) -> None:
    added = client.post(f"{API}/cart/items", json={"product_id": 10, "quantity": 1})
    order_number = client.post(
        f"{API}/orders/checkout",
        headers={"X-Cart-Token": added.headers["X-Cart-Token"]},
        json=checkout_body(),
    ).json()["order"]["order_number"]

    response = client.post(
        f"{API}/orders/payment/confirm",
        json={"order_number": order_number, "payload": {"intent_id": "forged"}},
    )
    assert response.status_code == 422
    assert client.get(f"{API}/orders/{order_number}").json()["payment_status"] == "failed"


def test_confirming_twice_is_idempotent(client: TestClient) -> None:
    added = client.post(f"{API}/cart/items", json={"product_id": 11, "quantity": 1})
    body = client.post(
        f"{API}/orders/checkout",
        headers={"X-Cart-Token": added.headers["X-Cart-Token"]},
        json=checkout_body(),
    ).json()
    payload = {
        "order_number": body["order"]["order_number"],
        "payload": {"intent_id": body["payment"]["intent_id"]},
    }
    first = client.post(f"{API}/orders/payment/confirm", json=payload).json()
    second = client.post(f"{API}/orders/payment/confirm", json=payload).json()
    assert first["payment_status"] == second["payment_status"] == "paid"


# ------------------------------------------------------------ cancellation ---


def test_cancelling_an_order_restores_stock(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    before = client.get(f"{API}/products/bloom-and-bar-hamper").json()
    client.post(
        f"{API}/cart/items",
        json={"product_id": before["id"], "quantity": 1},
        headers=auth_headers,
    )
    order_number = client.post(
        f"{API}/orders/checkout",
        headers=auth_headers,
        json=checkout_body(contact_email="priya@example.com"),
    ).json()["order"]["order_number"]

    cancelled = client.post(f"{API}/orders/{order_number}/cancel", headers=auth_headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    after = client.get(f"{API}/products/bloom-and-bar-hamper").json()
    assert after["stock_quantity"] == before["stock_quantity"]


def test_a_delivered_order_cannot_be_cancelled(
    client: TestClient, auth_headers: dict[str, str], admin_headers: dict[str, str]
) -> None:
    client.post(f"{API}/cart/items", json={"product_id": 13, "quantity": 1}, headers=auth_headers)
    order_number = client.post(
        f"{API}/orders/checkout",
        headers=auth_headers,
        json=checkout_body(contact_email="priya@example.com"),
    ).json()["order"]["order_number"]

    client.patch(
        f"{API}/admin/orders/{order_number}/status",
        headers=admin_headers,
        json={"status": "delivered", "notify_customer": False},
    )
    response = client.post(f"{API}/orders/{order_number}/cancel", headers=auth_headers)
    assert response.status_code == 409


# --------------------------------------------------------------- webhooks ---


def test_webhook_with_an_unmatched_reference_is_acknowledged(client: TestClient) -> None:
    """Regression: `event` is structlog's reserved first argument, so logging
    `event=...` as a keyword raised TypeError and returned 500. A 5xx makes the
    gateway retry a message we have already decided to ignore."""
    response = client.post(
        f"{API}/orders/payment/webhook",
        json={"event": "payment.captured", "payload": {}},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "ignored"


def test_webhook_marks_a_matching_order_paid(client: TestClient) -> None:
    added = client.post(f"{API}/cart/items", json={"product_id": 14, "quantity": 1})
    body = client.post(
        f"{API}/orders/checkout",
        headers={"X-Cart-Token": added.headers["X-Cart-Token"]},
        json=checkout_body(),
    ).json()

    response = client.post(
        f"{API}/orders/payment/webhook",
        json={
            "event": "payment.captured",
            "payload": {
                "payment": {"entity": {"order_id": body["payment"]["intent_id"], "id": "pay_123"}}
            },
        },
    )
    assert response.status_code == 200
    tracked = client.get(f"{API}/orders/{body['order']['order_number']}").json()
    assert tracked["payment_status"] == "paid"


# --------------------------------------------------------------- wishlist ---


def test_wishlist_requires_authentication(client: TestClient) -> None:
    assert client.get(f"{API}/wishlist").status_code == 401
    assert client.post(f"{API}/wishlist/1").status_code == 401


def test_wishlist_toggles_on_and_off(client: TestClient, auth_headers: dict) -> None:
    on = client.post(f"{API}/wishlist/5", headers=auth_headers).json()
    assert on == {"product_id": 5, "wishlisted": True}
    assert 5 in client.get(f"{API}/wishlist/ids", headers=auth_headers).json()

    listed = client.get(f"{API}/wishlist", headers=auth_headers).json()
    assert any(row["product"]["id"] == 5 for row in listed)

    off = client.post(f"{API}/wishlist/5", headers=auth_headers).json()
    assert off == {"product_id": 5, "wishlisted": False}
    assert 5 not in client.get(f"{API}/wishlist/ids", headers=auth_headers).json()


def test_wishlist_rejects_an_unknown_product(client: TestClient, auth_headers: dict) -> None:
    assert client.post(f"{API}/wishlist/999999", headers=auth_headers).status_code == 404


def test_one_users_wishlist_is_not_anothers(client: TestClient, auth_headers: dict) -> None:
    client.post(f"{API}/wishlist/6", headers=auth_headers)
    other = client.post(
        f"{API}/auth/login", json={"email": "arjun@example.com", "password": "Gyffty@2026"}
    ).json()
    other_headers = {"Authorization": f"Bearer {other['tokens']['access_token']}"}
    assert 6 not in client.get(f"{API}/wishlist/ids", headers=other_headers).json()
    client.post(f"{API}/wishlist/6", headers=auth_headers)  # clean up


# -------------------------------------------------------------- newsletter ---


def test_newsletter_subscribe_is_idempotent(client: TestClient) -> None:
    payload = {"email": "listme@example.com", "source": "footer"}
    first = client.post(f"{API}/newsletter/subscribe", json=payload)
    second = client.post(f"{API}/newsletter/subscribe", json=payload)
    assert first.status_code == 201
    # Subscribing twice is the same intent, not an error to show the shopper.
    assert second.status_code == 201
    assert second.json()["message"] == first.json()["message"]


def test_newsletter_rejects_a_malformed_address(client: TestClient) -> None:
    assert (
        client.post(f"{API}/newsletter/subscribe", json={"email": "not-an-email"}).status_code
        == 422
    )


def test_unsubscribe_does_not_reveal_membership(client: TestClient) -> None:
    """Same answer whether or not the address was ever on the list."""
    known = client.post(f"{API}/newsletter/unsubscribe", json={"email": "listme@example.com"})
    unknown = client.post(f"{API}/newsletter/unsubscribe", json={"email": "never-seen@example.com"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
