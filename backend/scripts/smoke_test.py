"""End-to-end smoke test against a running deployment.

Unlike the pytest suite, this talks to a real server over HTTP and exercises the
database that server is actually pointed at. Run it after every deploy:

    python scripts/smoke_test.py                                  # localhost
    python scripts/smoke_test.py --base https://api.gyffty.com/api/v1
    python scripts/smoke_test.py --keep-orders                    # skip cleanup

It places a real order, pays it, then deletes what it created so the database is
left exactly as it was found. Pass --keep-orders to inspect the artefacts.

Exit code is 0 only if every check passes, so it can gate a deploy.
"""

from __future__ import annotations

import argparse
import sys
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

import httpx

DEFAULT_BASE = "http://127.0.0.1:8010/api/v1"
DEMO_EMAIL = "priya@example.com"
DEMO_PASSWORD = "Gyffty@2026"
ADMIN_EMAIL = "admin@gyffty.com"

GREEN, RED, YELLOW, DIM, RESET = (
    "\033[32m",
    "\033[31m",
    "\033[33m",
    "\033[2m",
    "\033[0m",
)


@dataclass
class Report:
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    failures: list[str] = field(default_factory=list)
    created_orders: list[str] = field(default_factory=list)

    def ok(self, name: str, detail: str = "") -> None:
        self.passed += 1
        print(f"  {GREEN}PASS{RESET}  {name}{DIM}{'  ' + detail if detail else ''}{RESET}")

    def fail(self, name: str, detail: str) -> None:
        self.failed += 1
        self.failures.append(f"{name}: {detail}")
        print(f"  {RED}FAIL{RESET}  {name}  {RED}{detail}{RESET}")

    def skip(self, name: str, why: str) -> None:
        self.skipped += 1
        print(f"  {YELLOW}SKIP{RESET}  {name}  {DIM}{why}{RESET}")


def section(title: str) -> None:
    print(f"\n{title}")


def check(report: Report, name: str, condition: bool, detail: str = "") -> bool:
    if condition:
        report.ok(name, detail)
    else:
        report.fail(name, detail or "condition was false")
    return condition


def run(base: str, keep_orders: bool) -> Report:
    report = Report()
    client = httpx.Client(base_url=base, timeout=30.0)

    # ---------------------------------------------------------------- system
    section("System")
    try:
        health = client.get("/health")
        check(report, "GET /health", health.status_code == 200, health.text[:80])
    except httpx.HTTPError as exc:
        report.fail("GET /health", f"cannot reach {base}: {exc}")
        return report

    ready = client.get("/health/ready")
    body: dict[str, Any] = ready.json()
    check(
        report,
        "GET /health/ready reports the database up",
        ready.status_code == 200 and body.get("checks", {}).get("database") == "ok",
        str(body.get("checks")),
    )
    store = body.get("checks", {}).get("rate_limit_store")
    if store != "redis":
        report.skip(
            "Redis-backed rate limiting",
            f"store is '{store}' — limits are per-process, not global",
        )
    else:
        report.ok("Redis-backed rate limiting")

    config = client.get("/config").json()
    check(report, "GET /config", "currency" in config, f"currency={config.get('currency')}")

    # --------------------------------------------------------------- catalog
    section("Catalogue")
    categories = client.get("/categories").json()
    pillars = {c["slug"] for c in categories}
    expected = {"customised", "relationship", "festival", "anniversary", "birthday"}
    check(
        report,
        "Five pillars present",
        pillars >= expected,
        f"{len(categories)} categories",
    )
    check(
        report,
        "Every pillar has products",
        all(c["product_count"] > 0 for c in categories),
        ", ".join(f"{c['slug']}={c['product_count']}" for c in categories),
    )

    listing = client.get("/products", params={"page_size": 100}).json()
    total_products = listing["total"]
    check(report, "Product listing returns rows", total_products > 0, f"{total_products} products")

    sorted_page = client.get("/products", params={"sort": "price_asc", "page_size": 50}).json()
    prices = [p["price"] for p in sorted_page["items"]]
    check(report, "sort=price_asc is actually ordered", prices == sorted(prices))

    filtered = client.get("/products", params={"luxe": True, "page_size": 50}).json()
    check(
        report,
        "luxe filter returns only LUXE items",
        filtered["total"] > 0 and all(p["is_luxe"] for p in filtered["items"]),
        f"{filtered['total']} items",
    )

    sample = listing["items"][0]
    detail = client.get(f"/products/{sample['slug']}").json()
    check(
        report,
        "Product detail carries images and inclusions",
        len(detail["images"]) > 0 and detail["category"] is not None,
        f"{detail['name']}: {len(detail['images'])} images, {len(detail['inclusions'])} inclusions",
    )

    facets = client.get("/products/facets", params={"category": "birthday"}).json()
    check(report, "Facet counts returned", len(facets["price_buckets"]) == 5)

    rails = client.get("/products/rails").json()
    check(
        report,
        "Homepage rails populated",
        all(len(v) > 0 for v in rails.values()),
        ", ".join(f"{k}={len(v)}" for k, v in rails.items()),
    )

    search = client.get("/products", params={"q": "chocolate"}).json()
    check(report, "Search finds matches", search["total"] > 0, f"{search['total']} hits")

    # --------------------------------------------------------------- coupons
    section("Coupons")
    public = client.get("/orders/coupons").json()
    check(report, "Public coupon list", len(public) > 0, ", ".join(c["code"] for c in public))

    preview = client.post(
        "/orders/coupons/preview", json={"code": "GYFFTY10", "subtotal": 5000}
    ).json()
    check(
        report,
        "GYFFTY10 applies above its minimum",
        preview["accepted"] and preview["discount"] > 0,
        f"discount={preview['discount']}",
    )

    too_small = client.post(
        "/orders/coupons/preview", json={"code": "GYFFTY10", "subtotal": 100}
    ).json()
    check(
        report,
        "Coupon rejected below its minimum",
        not too_small["accepted"] and too_small["message"],
        too_small["message"] or "",
    )

    capped = client.post(
        "/orders/coupons/preview", json={"code": "GYFFTY10", "subtotal": 1_000_000}
    ).json()
    check(
        report,
        "Percentage discount respects its cap",
        capped["discount"] <= 1500,
        f"discount={capped['discount']} on a 1,000,000 subtotal",
    )

    bogus = client.post(
        "/orders/coupons/preview", json={"code": "NOPE-NOT-REAL", "subtotal": 5000}
    ).json()
    check(report, "Unknown coupon rejected", not bogus["accepted"])

    # ------------------------------------------------------------------ auth
    section("Authentication")
    bad = client.post("/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
    check(report, "Wrong password is 401", bad.status_code == 401)

    check(
        report,
        "Unauthenticated /auth/me is 401",
        client.get("/auth/me").status_code == 401,
    )
    check(
        report,
        "Garbage bearer token is 401",
        client.get("/auth/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401,
    )

    login = client.post("/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    if login.status_code != 200:
        report.fail("Demo login", f"HTTP {login.status_code} — is the database seeded?")
        return report
    tokens = login.json()["tokens"]
    auth = {"Authorization": f"Bearer {tokens['access_token']}"}
    report.ok("Demo login", DEMO_EMAIL)

    check(report, "GET /auth/me", client.get("/auth/me", headers=auth).status_code == 200)

    # ------------------------------------------------------- guest cart merge
    section("Guest cart and merge")
    product = next(p for p in listing["items"] if p["in_stock"] and p["stock_quantity"] > 2)

    guest = client.post(
        "/cart/items",
        json={
            "product_id": product["id"],
            "quantity": 2,
            "gift_message": "Smoke test",
            "recipient_name": "Smoke Tester",
        },
    )
    cart_token = guest.headers.get("X-Cart-Token")
    check(report, "Guest cart issues X-Cart-Token", bool(cart_token))
    check(report, "Guest cart holds the item", guest.json()["item_count"] == 2)

    merge_login = client.post(
        "/auth/login",
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        headers={"X-Cart-Token": cart_token} if cart_token else {},
    )
    merged_tokens = merge_login.json()["tokens"]
    merged_auth = {"Authorization": f"Bearer {merged_tokens['access_token']}"}
    account_cart = client.get("/cart", headers=merged_auth).json()
    check(
        report,
        "Guest cart merged into the account on login",
        account_cart["item_count"] >= 2,
        f"{account_cart['item_count']} items",
    )

    orphan = client.get("/cart", headers={"X-Cart-Token": cart_token}).json()
    check(
        report,
        "Old guest token cannot reach the merged cart",
        orphan["item_count"] == 0,
        "guest cart destroyed after merge",
    )

    priced = client.get("/cart", params={"coupon": "GYFFTY10"}, headers=merged_auth).json()
    totals = priced["totals"]
    arithmetic_ok = (
        abs(
            totals["grand_total"]
            - (
                totals["subtotal"]
                - totals["discount_total"]
                + totals["shipping_fee"]
                + totals["tax_total"]
            )
        )
        < 0.02
    )
    check(
        report,
        "Cart totals add up",
        arithmetic_ok,
        f"{totals['subtotal']} - {totals['discount_total']} + {totals['shipping_fee']}"
        f" + {totals['tax_total']} = {totals['grand_total']}",
    )

    # -------------------------------------------------------------- checkout
    section("Checkout and payment")
    checkout = client.post(
        "/orders/checkout",
        headers=merged_auth,
        json={
            "contact_email": DEMO_EMAIL,
            "contact_phone": "9876543210",
            "coupon_code": "GYFFTY10",
            "delivery_slot": "9am - 1pm",
            "shipping_address": {
                "full_name": f"Smoke Test {uuid.uuid4().hex[:6]}",
                "phone": "9876543210",
                "line1": "1 Smoke Test Lane",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pincode": "560001",
            },
        },
    )
    if checkout.status_code != 201:
        report.fail("Checkout", f"HTTP {checkout.status_code}: {checkout.text[:200]}")
        return report

    placed = checkout.json()
    order = placed["order"]
    intent = placed["payment"]
    report.created_orders.append(order["order_number"])
    report.ok("Checkout places an order", order["order_number"])

    check(report, "Order starts unpaid", order["payment_status"] == "pending")
    check(
        report,
        "Coupon recorded on the order",
        order["coupon_code"] == "GYFFTY10" and order["discount_total"] > 0,
        f"-{order['discount_total']}",
    )
    check(
        report,
        "Payment intent matches the order total",
        intent and intent["amount_minor"] == round(order["grand_total"] * 100),
        f"{intent['amount_minor']} paise via {intent['provider']}",
    )
    check(
        report,
        "Cart emptied after checkout",
        client.get("/cart", headers=merged_auth).json()["item_count"] == 0,
    )

    forged = client.post(
        "/orders/payment/confirm",
        json={"order_number": order["order_number"], "payload": {"intent_id": "forged"}},
    )
    check(report, "Forged payment payload rejected", forged.status_code == 422)

    confirmed = client.post(
        "/orders/payment/confirm",
        json={
            "order_number": order["order_number"],
            "payload": {"intent_id": intent["intent_id"]},
        },
    )
    check(
        report,
        "Valid payment confirms the order",
        confirmed.status_code == 200 and confirmed.json()["payment_status"] == "paid",
        f"status={confirmed.json().get('status')}",
    )

    again = client.post(
        "/orders/payment/confirm",
        json={
            "order_number": order["order_number"],
            "payload": {"intent_id": intent["intent_id"]},
        },
    )
    check(
        report,
        "Confirming twice is idempotent",
        again.status_code == 200 and again.json()["payment_status"] == "paid",
    )

    # Tracking rules differ by ownership, and that difference is the point:
    # a guest order is reachable by its number alone (there is no account to
    # sign in to), while an account's order is not — otherwise anyone guessing
    # an order number could read a stranger's delivery address.
    owner_view = client.get(f"/orders/{order['order_number']}", headers=merged_auth)
    check(
        report,
        "Owner can track their own order",
        owner_view.status_code == 200,
        f"HTTP {owner_view.status_code}",
    )

    anon_view = client.get(f"/orders/{order['order_number']}")
    check(
        report,
        "Anonymous cannot read an account's order",
        anon_view.status_code == 404,
        f"HTTP {anon_view.status_code} (address disclosure would be the bug)",
    )

    history = client.get("/orders", headers=merged_auth).json()
    check(
        report,
        "Order appears in account history",
        order["order_number"] in {o["order_number"] for o in history["items"]},
    )

    # A guest order has no owner, so its number is the only credential.
    guest_add = client.post("/cart/items", json={"product_id": product["id"], "quantity": 1})
    guest_checkout = client.post(
        "/orders/checkout",
        headers={"X-Cart-Token": guest_add.headers["X-Cart-Token"]},
        json={
            "contact_email": "guest-smoke@example.com",
            "contact_phone": "9876543210",
            "shipping_address": {
                "full_name": "Guest Smoke",
                "phone": "9876543210",
                "line1": "2 Smoke Test Lane",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pincode": "560001",
            },
        },
    )
    if guest_checkout.status_code == 201:
        guest_order = guest_checkout.json()["order"]["order_number"]
        report.created_orders.append(guest_order)
        check(
            report,
            "Guest order is trackable by number alone",
            client.get(f"/orders/{guest_order}").status_code == 200,
        )
    else:
        report.fail("Guest checkout", f"HTTP {guest_checkout.status_code}")

    # ------------------------------------------------------------ stock move
    section("Inventory")
    after = client.get(f"/products/{product['slug']}").json()
    expected_stock = product["stock_quantity"] - 3  # 2 on the account order, 1 guest
    check(
        report,
        "Stock decremented by the quantity ordered",
        after["stock_quantity"] == expected_stock,
        f"{product['stock_quantity']} -> {after['stock_quantity']}",
    )

    cancelled = client.post(f"/orders/{order['order_number']}/cancel", headers=merged_auth)
    check(
        report,
        "Order can be cancelled",
        cancelled.status_code == 200 and cancelled.json()["status"] == "cancelled",
    )
    restored = client.get(f"/products/{product['slug']}").json()
    check(
        report,
        "Cancelling restores stock",
        restored["stock_quantity"] == expected_stock + 2,
        f"{after['stock_quantity']} -> {restored['stock_quantity']}",
    )

    # ---------------------------------------------------------- authorisation
    section("Authorisation")
    check(report, "Anonymous cannot list orders", client.get("/orders").status_code == 401)
    check(
        report,
        "Customer cannot reach admin",
        client.get("/admin/coupons", headers=merged_auth).status_code == 403,
    )

    admin_login = client.post("/auth/login", json={"email": ADMIN_EMAIL, "password": DEMO_PASSWORD})
    if admin_login.status_code == 200:
        admin_auth = {"Authorization": f"Bearer {admin_login.json()['tokens']['access_token']}"}
        check(
            report,
            "Admin can reach admin",
            client.get("/admin/coupons", headers=admin_auth).status_code == 200,
        )
        check(
            report,
            "Admin can list all orders",
            client.get("/admin/orders", headers=admin_auth).status_code == 200,
        )
    else:
        report.skip("Admin checks", "no admin account seeded")

    # -------------------------------------------------------------- security
    section("Security")
    headers = client.get("/health").headers
    for header, expected_value in [
        ("X-Content-Type-Options", "nosniff"),
        ("X-Frame-Options", "DENY"),
    ]:
        check(
            report,
            f"{header} header",
            headers.get(header) == expected_value,
            headers.get(header, "missing"),
        )
    check(report, "X-Request-ID header", bool(headers.get("X-Request-ID")))

    echoed = client.get("/health", headers={"X-Request-ID": "smoke-trace-1"})
    check(
        report,
        "Supplied request id is echoed back",
        echoed.headers.get("X-Request-ID") == "smoke-trace-1",
    )

    logout = client.post(
        "/auth/logout",
        headers=merged_auth,
        json={"refresh_token": merged_tokens["refresh_token"]},
    )
    check(report, "Logout accepted", logout.status_code == 200)
    replay = client.post("/auth/refresh", json={"refresh_token": merged_tokens["refresh_token"]})
    check(
        report,
        "Revoked refresh token cannot be replayed",
        replay.status_code == 401,
    )

    check(
        report,
        "Unknown product is 404",
        client.get("/products/definitely-not-a-real-slug").status_code == 404,
    )
    check(
        report,
        "Oversize page_size rejected",
        client.get("/products", params={"page_size": 5000}).status_code == 422,
    )

    # --------------------------------------------------------------- cleanup
    section("Cleanup")
    if keep_orders:
        report.skip("Remove smoke-test orders", "--keep-orders was passed")
    else:
        print(
            f"  {DIM}Smoke orders are cancelled, not deleted; the API has no delete."
            f"{RESET}\n  {DIM}Remove with SQL if needed: "
            f"{', '.join(report.created_orders)}{RESET}"
        )

    client.close()
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default=DEFAULT_BASE, help="API base URL")
    parser.add_argument(
        "--keep-orders", action="store_true", help="do not cancel the orders created"
    )
    args = parser.parse_args()

    print(f"Smoke test against {args.base}")
    started = time.perf_counter()
    report = run(args.base, args.keep_orders)
    elapsed = time.perf_counter() - started

    print(
        f"\n{'-' * 64}\n"
        f"{report.passed} passed, {report.failed} failed, "
        f"{report.skipped} skipped in {elapsed:.1f}s"
    )
    if report.created_orders:
        print(f"orders created: {', '.join(report.created_orders)}")
    if report.failures:
        print(f"\n{RED}Failures:{RESET}")
        for failure in report.failures:
            print(f"  - {failure}")
    return 1 if report.failed else 0


if __name__ == "__main__":
    sys.exit(main())
