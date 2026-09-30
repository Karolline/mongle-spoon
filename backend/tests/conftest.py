from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.store import RecipeStore, seed

START = datetime(2026, 9, 1, 9, 0, tzinfo=UTC)


class FakeClock:
    """Returns a later time on every call, so updatedAt ordering is deterministic."""

    def __init__(self, start: datetime = START) -> None:
        self.now = start

    def __call__(self) -> datetime:
        self.now += timedelta(minutes=1)
        return self.now


@pytest.fixture
def store() -> RecipeStore:
    return RecipeStore(clock=FakeClock())


@pytest.fixture
def seeded_store(store: RecipeStore) -> RecipeStore:
    seed(store, now=START)
    return store


@pytest.fixture
def client(seeded_store: RecipeStore) -> TestClient:
    return TestClient(create_app(store=seeded_store))


@pytest.fixture
def empty_client(store: RecipeStore) -> TestClient:
    return TestClient(create_app(store=store))
