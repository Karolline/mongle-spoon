"""Key user workflows from product-spec.md, run against a SQLite database file.

These use the default app wiring (create_app() reading DATABASE_URL), so they
cover the same path the dev server uses, including persistence across restarts.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def database_url(tmp_path, monkeypatch) -> str:
    url = f"sqlite:///{tmp_path / 'app.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    return url


def names(res) -> list[str]:
    return [r["name"] for r in res.json()]


def test_add_find_edit_delete_recipe(database_url: str) -> None:
    client = TestClient(create_app())

    # Add two recipes; the newest one is listed first.
    potato = client.post(
        "/recipes",
        json={
            "name": "감자 미음",
            "ingredients": [{"name": "감자", "amount": "1/2개"}],
            "mealTimes": ["breakfast"],
        },
    ).json()
    client.post(
        "/recipes",
        json={
            "name": "소고기 진밥",
            "ingredients": [{"name": "소고기", "amount": "30g"}, {"name": "감자", "amount": "10g"}],
            "mealTimes": ["lunch_dinner"],
        },
    )
    assert names(client.get("/recipes")) == ["소고기 진밥", "감자 미음"]

    # Search matches ingredient names, and the meal-time filter narrows it down.
    assert names(client.get("/recipes", params={"search": "감자"})) == ["소고기 진밥", "감자 미음"]
    assert names(client.get("/recipes", params={"search": "감자", "mealTime": "breakfast"})) == [
        "감자 미음"
    ]

    # Editing a recipe moves it to the top of the list.
    edited = client.put(
        f"/recipes/{potato['id']}",
        json={
            "name": "감자 당근 미음",
            "ingredients": potato["ingredients"],
            "mealTimes": ["breakfast", "snack"],
        },
    ).json()
    assert edited["createdAt"] == potato["createdAt"]
    assert names(client.get("/recipes")) == ["감자 당근 미음", "소고기 진밥"]
    assert names(client.get("/recipes", params={"mealTime": "snack"})) == ["감자 당근 미음"]

    # Deleting removes it from the list and the detail endpoint.
    assert client.delete(f"/recipes/{potato['id']}").status_code == 204
    assert client.get(f"/recipes/{potato['id']}").status_code == 404
    assert names(client.get("/recipes")) == ["소고기 진밥"]


def test_recipes_survive_app_restart(database_url: str) -> None:
    created = TestClient(create_app()).post("/recipes", json={"name": "단호박 퓨레"}).json()
    # A fresh app on the same database sees the recipe.
    assert TestClient(create_app()).get(f"/recipes/{created['id']}").json() == created
