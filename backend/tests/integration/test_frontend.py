"""Serving the built frontend next to the API, as the Docker image does."""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.store import RecipeStore

INDEX = "<!doctype html><title>Mongle Spoon</title>"


@pytest.fixture
def dist(tmp_path):
    """A fake frontend build in tmp_path/dist, with a file just outside it."""
    (tmp_path / "secret.txt").write_text("outside", encoding="utf-8")
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(INDEX, encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    return dist


@pytest.fixture
def site(seeded_store: RecipeStore, dist) -> TestClient:
    return TestClient(create_app(store=seeded_store, frontend_dist=dist))


@pytest.mark.parametrize("path", ["/", "/recipes/new", "/recipes/abc", "/recipes/abc/edit"])
def test_app_routes_get_index_html(site: TestClient, path: str) -> None:
    response = site.get(path)
    assert response.status_code == 200
    assert response.text == INDEX
    assert response.headers["content-type"].startswith("text/html")


def test_built_files_are_served(site: TestClient) -> None:
    response = site.get("/assets/app.js")
    assert response.status_code == 200
    assert response.text == "console.log(1)"


def test_api_still_answers_json(site: TestClient) -> None:
    response = site.get("/api/recipes")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.parametrize("path", ["/api", "/api/nope", "/api/recipes/x/y"])
def test_unknown_api_paths_are_404_not_the_page(site: TestClient, path: str) -> None:
    response = site.get(path)
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


def test_files_outside_the_build_are_not_served(site: TestClient) -> None:
    response = site.get("/..%2Fsecret.txt")
    assert "outside" not in response.text


def test_without_a_build_only_the_api_is_served(seeded_store: RecipeStore) -> None:
    client = TestClient(create_app(store=seeded_store))
    assert client.get("/").status_code == 404
    assert client.get("/api/recipes").status_code == 200


def test_missing_build_fails_at_startup(seeded_store: RecipeStore, tmp_path) -> None:
    with pytest.raises(RuntimeError, match="Frontend build not found"):
        create_app(store=seeded_store, frontend_dist=tmp_path / "missing")
