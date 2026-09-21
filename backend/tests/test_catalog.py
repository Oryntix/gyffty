from __future__ import annotations

from fastapi.testclient import TestClient

API = "/api/v1"

PILLARS = {"customised", "relationship", "festival", "anniversary", "birthday"}


def test_health(client: TestClient) -> None:
    assert client.get(f"{API}/health").json()["status"] == "ok"


def test_category_tree_has_the_five_pillars(client: TestClient) -> None:
    body = client.get(f"{API}/categories").json()
    assert {c["slug"] for c in body} == PILLARS
    for pillar in body:
        assert pillar["children"], f"{pillar['slug']} should have collections"
        assert pillar["product_count"] > 0


def test_category_404(client: TestClient) -> None:
    response = client.get(f"{API}/categories/not-a-category")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_listing_includes_products_from_nested_collections(client: TestClient) -> None:
    """A pillar query must return hampers filed under its child collections."""
    body = client.get(f"{API}/products", params={"category": "birthday"}).json()
    assert body["total"] > 0
    slugs = {item["slug"] for item in body["items"]}
    assert "midnight-birthday-surprise-hamper" in slugs


def test_sorting_by_price(client: TestClient) -> None:
    body = client.get(f"{API}/products", params={"sort": "price_asc", "page_size": 50}).json()
    prices = [item["price"] for item in body["items"]]
    assert prices == sorted(prices)


def test_price_filter_bounds(client: TestClient) -> None:
    body = client.get(
        f"{API}/products", params={"min_price": 2000, "max_price": 4000, "page_size": 50}
    ).json()
    assert body["total"] > 0
    assert all(2000 <= item["price"] <= 4000 for item in body["items"])


def test_boolean_facets(client: TestClient) -> None:
    body = client.get(f"{API}/products", params={"luxe": True, "page_size": 50}).json()
    assert body["total"] > 0
    assert all(item["is_luxe"] for item in body["items"])


def test_search_matches_name_and_tags(client: TestClient) -> None:
    assert client.get(f"{API}/products", params={"q": "diwali"}).json()["total"] > 0
    assert client.get(f"{API}/products", params={"q": "zzzz-nothing"}).json()["total"] == 0


def test_pagination_metadata(client: TestClient) -> None:
    body = client.get(f"{API}/products", params={"page": 1, "page_size": 5}).json()
    assert len(body["items"]) == 5
    assert body["pages"] == (body["total"] + 4) // 5


def test_product_detail_shape(client: TestClient) -> None:
    body = client.get(f"{API}/products/rose-atelier-pamper-hamper").json()
    assert body["name"] == "Rose Atelier Pamper Hamper"
    assert body["category"]["slug"] == "for-her"
    assert len(body["inclusions"]) == 5
    assert body["primary_image"]
    assert body["discount_percent"] > 0


def test_facets_are_scoped_to_a_category(client: TestClient) -> None:
    body = client.get(f"{API}/products/facets", params={"category": "relationship"}).json()
    assert len(body["price_buckets"]) == 5
    assert {f["value"] for f in body["recipients"]} >= {"for-her", "for-him"}


def test_homepage_rails(client: TestClient) -> None:
    body = client.get(f"{API}/products/rails").json()
    assert set(body) == {"bestsellers", "new_arrivals", "luxe", "customisable"}
    assert all(item["is_luxe"] for item in body["luxe"])
