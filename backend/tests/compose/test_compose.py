"""Smoke tests for docker-compose.yaml: the real image against the real PostgreSQL.

They build and start the stack under a separate project name, volume and ports,
so a stack already running for development (and its data) is left alone. The
test volume is deleted afterwards. Needs Docker; run with
`uv run pytest tests/compose` (not part of the default run).
"""

import os
import re
import subprocess
import time
from pathlib import Path

import httpx
import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
PASSWORD = "compose-test"
APP_URL = "http://127.0.0.1:18000"

ENV = {
    **os.environ,
    "COMPOSE_PROJECT_NAME": "mongle-spoon-test",
    "PGDATA_VOLUME": "mongle-spoon-test-pgdata",
    "APP_PORT": "18000",
    "DB_PORT": "15432",
    "ADMIN_PASSWORD": PASSWORD,
}


def compose(*args: str) -> str:
    result = subprocess.run(
        ["docker", "compose", *args],
        cwd=REPO_ROOT,
        env=ENV,
        capture_output=True,
        check=False,
    )
    output = result.stdout.decode("utf-8", errors="replace")
    if result.returncode != 0:
        raise AssertionError(
            f"docker compose {' '.join(args)} failed:\n"
            + result.stderr.decode("utf-8", errors="replace")
        )
    return output


def wait_for_app(timeout: float = 60) -> None:
    deadline = time.monotonic() + timeout
    while True:
        try:
            if httpx.get(f"{APP_URL}/api/recipes").status_code == 200:
                return
        except httpx.TransportError:
            pass
        if time.monotonic() > deadline:
            raise AssertionError("app did not answer in time:\n" + compose("logs", "app"))
        time.sleep(1)


@pytest.fixture(scope="module")
def stack():
    compose("down", "-v")  # leftovers from an interrupted run
    try:
        compose("up", "-d", "--build", "--wait")
        wait_for_app()
        yield
    finally:
        compose("down", "-v")


def test_frontend_is_built_and_served(stack) -> None:
    page = httpx.get(f"{APP_URL}/")
    assert page.status_code == 200
    assert '<div id="root">' in page.text
    # Vite rewrites /src/main.tsx to a hashed bundle; a dev-only index.html would not.
    assert "/src/main.tsx" not in page.text

    scripts = re.findall(r'<script[^>]+src="([^"]+)"', page.text)
    assert scripts
    bundle = httpx.get(f"{APP_URL}{scripts[0]}")
    assert bundle.status_code == 200
    assert "javascript" in bundle.headers["content-type"]


def test_backend_stores_recipes_in_postgres(stack) -> None:
    created = httpx.post(
        f"{APP_URL}/api/recipes",
        headers={"Authorization": f"Bearer {PASSWORD}"},
        json={
            "name": "감자 미음",
            "ingredients": [{"name": "감자", "amount": "1/2개"}],
            "mealTimes": ["breakfast"],
        },
    )
    assert created.status_code == 201
    recipe_id = created.json()["id"]

    fetched = httpx.get(f"{APP_URL}/api/recipes/{recipe_id}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "감자 미음"

    # The row is in the PostgreSQL container, not in a SQLite file inside the app.
    rows = compose(
        "exec", "-T", "db",
        "psql", "-U", "mongle", "-d", "mongle_spoon", "-tA",
        "-c", f"SELECT name FROM recipes WHERE id = '{recipe_id}'",
    )
    assert rows.strip() == "감자 미음"
