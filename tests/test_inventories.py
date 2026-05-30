from fastapi.testclient import TestClient


def _register_and_login(client: TestClient, email: str) -> dict[str, str]:
    password = "correct-password"
    register_response = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": email.split("@", 1)[0]},
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_inventory(client: TestClient, auth_headers: dict[str, str], name: str = "Main Shop") -> dict:
    response = client.post(
        "/api/inventories",
        headers=auth_headers,
        json={"name": name, "description": "Primary inventory"},
    )
    assert response.status_code == 201
    return response.json()


def test_create_inventory(client: TestClient, auth_headers: dict[str, str]):
    data = _create_inventory(client, auth_headers)

    assert data["id"]
    assert data["name"] == "Main Shop"
    assert data["description"] == "Primary inventory"
    assert data["category_count"] == 0
    assert data["item_count"] == 0


def test_list_inventories(client: TestClient, auth_headers: dict[str, str]):
    _create_inventory(client, auth_headers, name="Main Shop")
    _create_inventory(client, auth_headers, name="Warehouse")

    response = client.get("/api/inventories", headers=auth_headers)

    assert response.status_code == 200
    names = {inventory["name"] for inventory in response.json()}
    assert names == {"Main Shop", "Warehouse"}


def test_update_inventory(client: TestClient, auth_headers: dict[str, str]):
    inventory = _create_inventory(client, auth_headers)

    response = client.put(
        f"/api/inventories/{inventory['id']}",
        headers=auth_headers,
        json={"name": "Updated Shop", "description": "Updated description"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == inventory["id"]
    assert data["name"] == "Updated Shop"
    assert data["description"] == "Updated description"


def test_delete_inventory(client: TestClient, auth_headers: dict[str, str]):
    inventory = _create_inventory(client, auth_headers)

    delete_response = client.delete(
        f"/api/inventories/{inventory['id']}",
        headers=auth_headers,
    )
    get_response = client.get(
        f"/api/inventories/{inventory['id']}",
        headers=auth_headers,
    )

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_cannot_access_another_users_inventory(client: TestClient):
    user_a_headers = _register_and_login(client, "user-a@example.com")
    user_b_headers = _register_and_login(client, "user-b@example.com")
    inventory = _create_inventory(client, user_a_headers)

    response = client.get(
        f"/api/inventories/{inventory['id']}",
        headers=user_b_headers,
    )

    assert response.status_code == 404
