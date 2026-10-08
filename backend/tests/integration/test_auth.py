"""Write protection: reading is public, writing needs ADMIN_PASSWORD."""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.store import RecipeStore


def write_requests(client: TestClient, recipe_id: str) -> list[int]:
    return [
        client.post("/api/recipes", json={"name": "x"}).status_code,
        client.put(f"/api/recipes/{recipe_id}", json={"name": "x"}).status_code,
        client.delete(f"/api/recipes/{recipe_id}").status_code,
    ]


def first_id(client: TestClient) -> str:
    return client.get("/api/recipes").json()[0]["id"]


def test_reading_needs_no_password(anon_client: TestClient) -> None:
    recipe_id = first_id(anon_client)
    assert anon_client.get(f"/api/recipes/{recipe_id}").status_code == 200
    assert anon_client.get("/api/recipes", params={"search": "소고기"}).status_code == 200


def test_writing_without_password_is_rejected(anon_client: TestClient) -> None:
    recipe_id = first_id(anon_client)
    before = anon_client.get("/api/recipes").json()

    assert write_requests(anon_client, recipe_id) == [401, 401, 401]

    res = anon_client.delete(f"/api/recipes/{recipe_id}")
    assert res.headers["www-authenticate"] == "Bearer"
    assert anon_client.get("/api/recipes").json() == before


@pytest.mark.parametrize(
    "authorization",
    ["Bearer wrong", "Bearer test-passwordX", "Basic test-password", "test-password"],
)
def test_writing_with_wrong_password_is_rejected(
    anon_client: TestClient, authorization: str
) -> None:
    anon_client.headers["Authorization"] = authorization
    assert write_requests(anon_client, first_id(anon_client)) == [401, 401, 401]


def test_writing_with_password_succeeds(client: TestClient) -> None:
    assert write_requests(client, first_id(client)) == [201, 200, 204]


def test_verify_checks_the_password(anon_client: TestClient) -> None:
    assert anon_client.post("/api/auth/verify").status_code == 401
    wrong = {"Authorization": "Bearer nope"}
    assert anon_client.post("/api/auth/verify", headers=wrong).status_code == 401
    right = {"Authorization": "Bearer test-password"}
    assert anon_client.post("/api/auth/verify", headers=right).status_code == 204


def test_writes_are_disabled_without_admin_password(
    seeded_store: RecipeStore, monkeypatch
) -> None:
    monkeypatch.delenv("ADMIN_PASSWORD")
    client = TestClient(create_app(store=seeded_store))
    recipe_id = first_id(client)

    assert client.get(f"/api/recipes/{recipe_id}").status_code == 200
    assert write_requests(client, recipe_id) == [503, 503, 503]
    # Any guess is refused, including an empty password.
    client.headers["Authorization"] = "Bearer "
    assert client.post("/api/auth/verify").status_code == 503


def test_cors_preflight_allows_authorization_header(anon_client: TestClient) -> None:
    res = anon_client.options(
        "/api/recipes",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert res.status_code == 200
    assert "authorization" in res.headers["access-control-allow-headers"].lower()
