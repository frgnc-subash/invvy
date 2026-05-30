import os
import sys
from pathlib import Path
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["JWT_SECRET"] = "test-secret"
os.environ["USE_LOCAL_SQLITE"] = "true"

ROOT_DIR = Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT_DIR / "server"
sys.path.insert(0, str(SERVER_DIR))

from app import main as app_main  # noqa: E402
from app.database import Base, get_db  # noqa: E402


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

    Base.metadata.create_all(bind=engine)
    app_main.engine = engine

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app_main.app.dependency_overrides[get_db] = override_get_db

    with TestClient(app_main.app) as test_client:
        yield test_client

    app_main.app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def registered_user(client: TestClient) -> dict[str, str]:
    payload = {
        "email": "user@example.com",
        "password": "correct-password",
        "name": "Test User",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    return payload


@pytest.fixture
def auth_headers(client: TestClient, registered_user: dict[str, str]) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
