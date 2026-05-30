from fastapi.testclient import TestClient


def _create_inventory(client: TestClient, auth_headers: dict[str, str]) -> dict:
    response = client.post(
        "/api/inventories",
        headers=auth_headers,
        json={"name": "Main Shop", "description": "Primary inventory"},
    )
    assert response.status_code == 201
    return response.json()


def _create_category(client: TestClient, auth_headers: dict[str, str], inventory_id: str) -> dict:
    response = client.post(
        f"/api/inventories/{inventory_id}/categories",
        headers=auth_headers,
        json={"name": "Electronics", "description": "Electronic inventory"},
    )
    assert response.status_code == 201
    return response.json()


def _create_item(
    client: TestClient,
    auth_headers: dict[str, str],
    category_id: str,
    **overrides,
) -> dict:
    payload = {
        "name": "AA Batteries",
        "sku": "aa-001",
        "category_id": category_id,
        "quantity": 10,
        "min_stock": 3,
        "price": 2.5,
        "cost": 1.0,
        "supplier": "Acme Supplies",
        "unit": "packs",
        "status": "in-stock",
        "image": None,
    }
    payload.update(overrides)

    response = client.post("/api/items", headers=auth_headers, json=payload)
    assert response.status_code == 201
    return response.json()


def _inventory_and_category(client: TestClient, auth_headers: dict[str, str]) -> tuple[dict, dict]:
    inventory = _create_inventory(client, auth_headers)
    category = _create_category(client, auth_headers, inventory["id"])
    return inventory, category


def test_create_item(client: TestClient, auth_headers: dict[str, str]):
    _, category = _inventory_and_category(client, auth_headers)

    data = _create_item(client, auth_headers, category["id"])

    assert data["id"]
    assert data["name"] == "AA Batteries"
    assert data["category_id"] == category["id"]
    assert data["quantity"] == 10


def test_list_items_by_category(client: TestClient, auth_headers: dict[str, str]):
    inventory = _create_inventory(client, auth_headers)
    electronics = _create_category(client, auth_headers, inventory["id"])
    grocery_response = client.post(
        f"/api/inventories/{inventory['id']}/categories",
        headers=auth_headers,
        json={"name": "Grocery", "description": "Grocery inventory"},
    )
    assert grocery_response.status_code == 201
    grocery = grocery_response.json()

    expected_item = _create_item(client, auth_headers, electronics["id"], name="AA Batteries")
    _create_item(client, auth_headers, grocery["id"], name="Coffee Beans", sku="coffee-001")

    response = client.get(
        f"/api/items?cat_id={electronics['id']}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == expected_item["id"]


def test_sku_is_uppercased_on_create(client: TestClient, auth_headers: dict[str, str]):
    _, category = _inventory_and_category(client, auth_headers)

    data = _create_item(client, auth_headers, category["id"], sku="mixed-case-123")

    assert data["sku"] == "MIXED-CASE-123"


def test_update_item(client: TestClient, auth_headers: dict[str, str]):
    _, category = _inventory_and_category(client, auth_headers)
    item = _create_item(client, auth_headers, category["id"])

    response = client.put(
        f"/api/items/{item['id']}",
        headers=auth_headers,
        json={
            "name": "Updated Batteries",
            "sku": "updated-001",
            "category_id": category["id"],
            "quantity": 22,
            "min_stock": 5,
            "price": 3.5,
            "cost": 1.5,
            "supplier": "Updated Supplier",
            "unit": "boxes",
            "status": "low-stock",
            "image": None,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == item["id"]
    assert data["name"] == "Updated Batteries"
    assert data["sku"] == "UPDATED-001"
    assert data["quantity"] == 22
    assert data["status"] == "low-stock"


def test_delete_item(client: TestClient, auth_headers: dict[str, str]):
    _, category = _inventory_and_category(client, auth_headers)
    item = _create_item(client, auth_headers, category["id"])

    delete_response = client.delete(f"/api/items/{item['id']}", headers=auth_headers)
    get_response = client.get(f"/api/items/{item['id']}", headers=auth_headers)

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_dashboard_stats_accuracy(client: TestClient, auth_headers: dict[str, str]):
    _, category = _inventory_and_category(client, auth_headers)
    _create_item(
        client,
        auth_headers,
        category["id"],
        name="In Stock Item",
        sku="in-001",
        quantity=10,
        min_stock=3,
        price=2.0,
        cost=1.0,
        status="in-stock",
    )
    _create_item(
        client,
        auth_headers,
        category["id"],
        name="Low Stock Item",
        sku="low-001",
        quantity=2,
        min_stock=5,
        price=10.0,
        cost=4.0,
        status="in-stock",
    )
    _create_item(
        client,
        auth_headers,
        category["id"],
        name="Out Stock Item",
        sku="out-001",
        quantity=0,
        min_stock=5,
        price=7.0,
        cost=3.0,
        status="out-of-stock",
    )

    response = client.get("/api/dashboard/stats", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["total_items"] == 3
    assert data["in_stock"] == 1
    assert data["low_stock"] == 1
    assert data["out_of_stock"] == 1
    assert data["inventory_count"] == 1
    assert data["category_count"] == 1
    assert data["total_value"] == 40.0
    assert data["total_cost"] == 18.0
