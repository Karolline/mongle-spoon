import os

# Importing app.main builds the default app; keep it off the real database file.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ADMIN_PASSWORD"] = "test-password"

from datetime import UTC, datetime, timedelta  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from sqlalchemy import Engine  # noqa: E402

from app.db import Base, make_engine  # noqa: E402
from app.main import create_app  # noqa: E402
from app.store import RecipeStore, seed  # noqa: E402

START = datetime(2026, 9, 1, 9, 0, tzinfo=UTC)
AUTH = {"Authorization": "Bearer test-password"}

# Set TEST_DATABASE_URL to run the suite on PostgreSQL. Use a throwaway database:
# every test drops and recreates all tables. Defaults to in-memory SQLite.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")


def fresh_engine(url: str = TEST_DATABASE_URL) -> Engine:
    """An engine on `url` with empty tables."""
    engine = make_engine(url)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return engine


class FakeClock:
    """Returns a later time on every call, so updatedAt ordering is deterministic."""

    def __init__(self, start: datetime = START) -> None:
        self.now = start

    def __call__(self) -> datetime:
        self.now += timedelta(minutes=1)
        return self.now


@pytest.fixture
def engine():
    engine = fresh_engine()
    yield engine
    engine.dispose()


@pytest.fixture
def store(engine: Engine) -> RecipeStore:
    return RecipeStore(engine=engine, clock=FakeClock())


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
