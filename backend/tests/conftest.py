import os

# Importing app.main builds the default app; keep it off the real database file.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ADMIN_PASSWORD"] = "test-password"

from datetime import UTC, datetime, timedelta  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import make_engine  # noqa: E402
from app.main import create_app  # noqa: E402
from app.store import RecipeStore, seed  # noqa: E402

START = datetime(2026, 9, 1, 9, 0, tzinfo=UTC)
AUTH = {"Authorization": "Bearer test-password"}


class FakeClock:
    """Returns a later time on every call, so updatedAt ordering is deterministic."""

    def __init__(self, start: datetime = START) -> None:
        self.now = start

    def __call__(self) -> datetime:
        self.now += timedelta(minutes=1)
        return self.now


@pytest.fixture
def store() -> RecipeStore:
    return RecipeStore(engine=make_engine("sqlite://"), clock=FakeClock())


@pytest.fixture
def seeded_store(store: RecipeStore) -> RecipeStore:
    seed(store, now=START)
    return store


@pytest.fixture
def client(seeded_store: RecipeStore) -> TestClient:
    """Sends the admin password with every request."""
    return TestClient(create_app(store=seeded_store), headers=AUTH)


@pytest.fixture
def empty_client(store: RecipeStore) -> TestClient:
    """Sends the admin password with every request."""
    return TestClient(create_app(store=store), headers=AUTH)


@pytest.fixture
def anon_client(seeded_store: RecipeStore) -> TestClient:
    """Sends no password, like a family member who only views recipes."""
    return TestClient(create_app(store=seeded_store))
