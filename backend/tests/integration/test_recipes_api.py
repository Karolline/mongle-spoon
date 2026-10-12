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
    "leftoverUnit": "큐브",
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
    "pinnedAt",
    "lastMadeOn",
    "leftover",
    "leftoverUnit",
}


def test_list_returns_seeded_recipes_newest_first(client: TestClient) -> None:
    res = client.get("/api/recipes")
    assert res.status_code == 200
    body = res.json()
    assert len(body) >= 4
    assert all(set(r) == RECIPE_KEYS for r in body)
    updated = [r["updatedAt"] for r in body]  # nothing pinned in the seed
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
    assert body["pinnedAt"] is None
    assert body["lastMadeOn"] is None
    assert body["leftover"] is None
    assert body["leftoverUnit"] == "큐브"


def test_create_with_only_name_fills_defaults(empty_client: TestClient) -> None:
    res = empty_client.post("/api/recipes", json={"name": "감자 미음"})
    assert res.status_code == 201
    body = res.json()
    assert body["ingredients"] == []
    assert body["mealTimes"] == []
    assert body["instructions"] == body["servings"] == body["notes"] == ""
    assert body["leftover"] is None
    assert body["leftoverUnit"] == ""


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


def test_pin_and_unpin(client: TestClient) -> None:
    last = client.get("/api/recipes").json()[-1]

    res = client.post(f"/api/recipes/{last['id']}/pin")
    assert res.status_code == 200
    pinned = res.json()
    assert pinned["pinnedAt"] is not None
    assert pinned["updatedAt"] == last["updatedAt"]
    assert client.get("/api/recipes").json()[0] == pinned

    res = client.delete(f"/api/recipes/{last['id']}/pin")
    assert res.status_code == 200
    assert res.json() == {**pinned, "pinnedAt": None}
    assert client.get("/api/recipes").json()[-1]["id"] == last["id"]


def test_set_and_clear_last_made(client: TestClient) -> None:
    last = client.get("/api/recipes").json()[-1]

    res = client.put(
        f"/api/recipes/{last['id']}/last-made", json={"lastMadeOn": "2026-10-11"}
    )
    assert res.status_code == 200
    made = res.json()
    assert made == {**last, "lastMadeOn": "2026-10-11"}
    assert client.get("/api/recipes").json()[0] == made

    res = client.delete(f"/api/recipes/{last['id']}/last-made")
    assert res.status_code == 200
    assert res.json() == last
    assert client.get("/api/recipes").json()[-1]["id"] == last["id"]


def test_last_made_must_be_a_date(client: TestClient) -> None:
    recipe_id = client.get("/api/recipes").json()[0]["id"]
    path = f"/api/recipes/{recipe_id}/last-made"
    for body in (
        {},
        {"lastMadeOn": None},
        {"lastMadeOn": "2026-13-01"},
        {"lastMadeOn": "2026-10-11T09:00:00Z"},
        {"lastMadeOn": "2026-10-11", "extra": 1},
    ):
        assert client.put(path, json=body).status_code == 422, body


def test_set_and_clear_leftover(empty_client: TestClient) -> None:
    created = empty_client.post("/api/recipes", json=FULL_INPUT).json()
    path = f"/api/recipes/{created['id']}/leftover"

    res = empty_client.put(path, json={"leftover": 5})
    assert res.status_code == 200
    # Only the amount changes; updatedAt is kept.
    assert res.json() == {**created, "leftover": 5}
    assert empty_client.get(f"/api/recipes/{created['id']}").json()["leftover"] == 5

    for amount in (0, 999):
        assert empty_client.put(path, json={"leftover": amount}).json()["leftover"] == amount

    res = empty_client.delete(path)
    assert res.status_code == 200
    assert res.json() == created


def test_leftover_must_be_a_whole_number_from_0_to_999(empty_client: TestClient) -> None:
    created = empty_client.post("/api/recipes", json=FULL_INPUT).json()
    path = f"/api/recipes/{created['id']}/leftover"
    for body in (
        {},
        {"leftover": None},
        {"leftover": -1},
        {"leftover": 1000},
        {"leftover": 2.5},
        {"leftover": "3"},
        {"leftover": True},
        {"leftover": 3, "extra": 1},
    ):
        assert empty_client.put(path, json=body).status_code == 422, body
    assert empty_client.get(f"/api/recipes/{created['id']}").json() == created


def test_update_keeps_leftover_and_changes_unit(empty_client: TestClient) -> None:
    created = empty_client.post("/api/recipes", json=FULL_INPUT).json()
    empty_client.put(f"/api/recipes/{created['id']}/leftover", json={"leftover": 4})

    res = empty_client.put(
        f"/api/recipes/{created['id']}", json={**FULL_INPUT, "leftoverUnit": "통"}
    )
    assert res.status_code == 200
    assert res.json()["leftover"] == 4
    assert res.json()["leftoverUnit"] == "통"


def test_unknown_id_returns_404(empty_client: TestClient) -> None:
    for res in (
        empty_client.get("/api/recipes/nope"),
        empty_client.put("/api/recipes/nope", json={"name": "x"}),
        empty_client.post("/api/recipes/nope/pin"),
        empty_client.delete("/api/recipes/nope/pin"),
        empty_client.put("/api/recipes/nope/last-made", json={"lastMadeOn": "2026-10-11"}),
        empty_client.delete("/api/recipes/nope/last-made"),
        empty_client.put("/api/recipes/nope/leftover", json={"leftover": 5}),
        empty_client.delete("/api/recipes/nope/leftover"),
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
        client.post("/api/recipes/x/pin"),
        client.delete("/api/recipes/x/pin"),
        client.put("/api/recipes/x/last-made", json={"lastMadeOn": "2026-10-11"}),
        client.delete("/api/recipes/x/last-made"),
        client.put("/api/recipes/x/leftover", json={"leftover": 5}),
        client.delete("/api/recipes/x/leftover"),
        client.post("/api/auth/verify"),
    ]
    assert [r.status_code for r in responses] == [418] * 12
