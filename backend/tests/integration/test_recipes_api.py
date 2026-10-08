"""Endpoint tests: HTTP request -> router -> store -> in-memory SQLite."""

from fastapi.testclient import TestClient

from app.auth import require_access
from app.main import create_app
from app.store import RecipeStore
from tests.conftest import AUTH

FULL_INPUT = {
    "name": "감자 미음",
    "ingredients": [{"name": "감자", "amount": "1/2개"}],
    "instructions": "감자를 쪄서 으깹니다.",
    "servings": "2회분",
    "mealTimes": ["breakfast"],
    "notes": "",
}

RECIPE_KEYS = {
    "id",
    "name",
    "ingredients",
    "instructions",
    "servings",
    "mealTimes",
    "notes",
    "createdAt",
    "updatedAt",
}


def test_list_returns_seeded_recipes_newest_first(client: TestClient) -> None:
    res = client.get("/api/recipes")
    assert res.status_code == 200
    body = res.json()
    assert len(body) >= 4
    assert all(set(r) == RECIPE_KEYS for r in body)
    updated = [r["updatedAt"] for r in body]
    assert updated == sorted(updated, reverse=True)


def test_list_with_search_and_meal_time(client: TestClient) -> None:
    res = client.get("/api/recipes", params={"search": "죽", "mealTime": "breakfast"})
    assert res.status_code == 200
    assert [r["name"] for r in res.json()] == ["바나나 오트밀 죽"]


def test_list_no_match_returns_empty_array(client: TestClient) -> None:
    res = client.get("/api/recipes", params={"search": "없는재료"})
    assert res.status_code == 200
    assert res.json() == []


def test_list_rejects_unknown_meal_time(client: TestClient) -> None:
    assert client.get("/api/recipes", params={"mealTime": "dinner"}).status_code == 422


def test_create_returns_201_with_full_recipe(empty_client: TestClient) -> None:
    res = empty_client.post("/api/recipes", json=FULL_INPUT)
    assert res.status_code == 201
    body = res.json()
    assert set(body) == RECIPE_KEYS
    assert body["mealTimes"] == ["breakfast"]
    assert body["createdAt"] == body["updatedAt"]


def test_create_with_only_name_fills_defaults(empty_client: TestClient) -> None:
    res = empty_client.post("/api/recipes", json={"name": "감자 미음"})
    assert res.status_code == 201
    body = res.json()
    assert body["ingredients"] == []
    assert body["mealTimes"] == []
    assert body["instructions"] == body["servings"] == body["notes"] == ""


def test_create_validation_errors(empty_client: TestClient) -> None:
    bad_bodies = [
        {},
        {"name": ""},
        {"name": "   "},
        {"name": "x", "mealTimes": ["dinner"]},
        {"name": "x", "mealTimes": ["snack", "snack"]},
        {"name": "x", "ingredients": [{"name": "감자"}]},
        {"name": "x", "unknownField": 1},
    ]
    for body in bad_bodies:
        res = empty_client.post("/api/recipes", json=body)
        assert res.status_code == 422, body
        assert isinstance(res.json()["detail"], list)
    assert empty_client.get("/api/recipes").json() == []


def test_get_update_delete_round_trip(empty_client: TestClient) -> None:
    created = empty_client.post("/api/recipes", json=FULL_INPUT).json()
    recipe_id = created["id"]

    assert empty_client.get(f"/api/recipes/{recipe_id}").json() == created

    res = empty_client.put(
        f"/api/recipes/{recipe_id}",
        json={**FULL_INPUT, "name": "감자 당근 미음", "mealTimes": ["lunch_dinner"]},
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["id"] == recipe_id
    assert updated["name"] == "감자 당근 미음"
    assert updated["createdAt"] == created["createdAt"]
    assert updated["updatedAt"] > created["updatedAt"]

    res = empty_client.delete(f"/api/recipes/{recipe_id}")
    assert res.status_code == 204
    assert res.content == b""
    assert empty_client.get(f"/api/recipes/{recipe_id}").status_code == 404


def test_update_is_full_replacement(empty_client: TestClient) -> None:
    created = empty_client.post("/api/recipes", json=FULL_INPUT).json()
    updated = empty_client.put(
        f"/api/recipes/{created['id']}", json={"name": "감자 미음"}
    ).json()
    assert updated["ingredients"] == []
    assert updated["mealTimes"] == []
    assert updated["instructions"] == ""


def test_unknown_id_returns_404(empty_client: TestClient) -> None:
    for res in (
        empty_client.get("/api/recipes/nope"),
        empty_client.put("/api/recipes/nope", json={"name": "x"}),
    ):
        assert res.status_code == 404
        assert res.json() == {"detail": "Recipe not found"}


def test_delete_unknown_id_returns_204(empty_client: TestClient) -> None:
    assert empty_client.delete("/api/recipes/nope").status_code == 204


def test_update_validation_error(empty_client: TestClient) -> None:
    created = empty_client.post("/api/recipes", json=FULL_INPUT).json()
    res = empty_client.put(f"/api/recipes/{created['id']}", json={"name": ""})
    assert res.status_code == 422


def test_cors_allows_frontend_dev_server(empty_client: TestClient) -> None:
    res = empty_client.get("/api/recipes", headers={"Origin": "http://localhost:5173"})
    assert res.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_every_route_goes_through_require_access(store: RecipeStore) -> None:
    from fastapi import HTTPException

    def deny() -> None:
        raise HTTPException(status_code=418)

    app = create_app(store=store)
    app.dependency_overrides[require_access] = deny
    client = TestClient(app, headers=AUTH)
    responses = [
        client.get("/api/recipes"),
        client.post("/api/recipes", json={"name": "x"}),
        client.get("/api/recipes/x"),
        client.put("/api/recipes/x", json={"name": "x"}),
        client.delete("/api/recipes/x"),
        client.post("/api/auth/verify"),
    ]
    assert [r.status_code for r in responses] == [418] * 6
