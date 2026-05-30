from fastapi.testclient import TestClient


def test_register_success(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "new-user@example.com",
            "password": "correct-password",
            "name": "New User",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client: TestClient):
    payload = {
        "email": "duplicate@example.com",
        "password": "correct-password",
        "name": "Duplicate User",
    }

    first_response = client.post("/api/auth/register", json=payload)
    duplicate_response = client.post("/api/auth/register", json=payload)

    assert first_response.status_code == 201
    assert duplicate_response.status_code == 400


def test_login_success(client: TestClient, registered_user: dict[str, str]):
    response = client.post(
        "/api/auth/login",
        json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient, registered_user: dict[str, str]):
    response = client.post(
        "/api/auth/login",
        json={
            "email": registered_user["email"],
            "password": "wrong-password",
        },
    )

    assert response.status_code == 401


def test_get_me_authenticated(client: TestClient, registered_user: dict[str, str], auth_headers: dict[str, str]):
    response = client.get("/api/auth/me", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == registered_user["email"]
    assert data["name"] == registered_user["name"]
    assert "hashed_password" not in data


def test_get_me_no_token(client: TestClient):
    response = client.get("/api/auth/me")

    assert response.status_code == 401
