from pathlib import Path

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import Engine, MetaData, create_engine, inspect

from app.db import Base, normalize_url
from app.models import MealTime, RecipeInput
from app.store import RecipeStore
from tests.conftest import TEST_DATABASE_URL

ALEMBIC_INI = Path(__file__).parents[2] / "alembic.ini"
# The first migration: the tables from before Alembic. Existing databases are
# stamped with it, so it must never change.
BASELINE = "f9e81a5676ed"


def alembic_config(url: str) -> Config:
    config = Config(ALEMBIC_INI)
    config.set_main_option("sqlalchemy.url", url)
    return config


def drop_everything(engine: Engine) -> None:
    """Drop all tables, including alembic_version (not in Base.metadata)."""
    metadata = MetaData()
    metadata.reflect(engine)
    metadata.drop_all(engine)


@pytest.fixture
def url(tmp_path):
    """An empty database, on PostgreSQL when TEST_DATABASE_URL points there.

    In-memory SQLite is a new database per connection, so use a file instead.
    """
    if TEST_DATABASE_URL in ("sqlite://", "sqlite+pysqlite://"):
        yield f"sqlite:///{tmp_path / 'migrated.db'}"
        return
    engine = create_engine(normalize_url(TEST_DATABASE_URL))
    drop_everything(engine)
    yield TEST_DATABASE_URL
    drop_everything(engine)
    engine.dispose()


def differences_from_models(engine: Engine) -> list:
    with engine.connect() as connection:
        return compare_metadata(MigrationContext.configure(connection), Base.metadata)


def table_names(engine: Engine) -> set[str]:
    return set(inspect(engine).get_table_names())


def test_upgrade_builds_the_tables_of_the_models(url):
    command.upgrade(alembic_config(url), "head")

    engine = create_engine(normalize_url(url))
    assert differences_from_models(engine) == []
    assert "alembic_version" in table_names(engine)
    engine.dispose()


def test_downgrade_removes_every_table_and_upgrade_works_again(url):
    config = alembic_config(url)
    command.upgrade(config, "head")

    command.downgrade(config, "base")
    engine = create_engine(normalize_url(url))
    assert table_names(engine) == {"alembic_version"}

    command.upgrade(config, "head")
    assert differences_from_models(engine) == []
    engine.dispose()


def test_a_database_from_before_alembic_can_be_stamped_and_upgraded(url):
    # What make_engine() used to build, holding data that must survive.
    engine = create_engine(normalize_url(url))
    Base.metadata.create_all(engine)
    created = RecipeStore(engine=engine).create(
        RecipeInput(name="감자 미음", meal_times=[MealTime.BREAKFAST])
    )
    config = alembic_config(url)

    command.stamp(config, BASELINE)
    command.upgrade(config, "head")

    assert differences_from_models(engine) == []
    assert RecipeStore(engine=engine).get(created.id) == created
    engine.dispose()


def test_upgrade_uses_a_passed_connection(tmp_path):
    # In-memory SQLite only works this way: a new connection would be a new DB.
    engine = create_engine(f"sqlite:///{tmp_path / 'shared.db'}")
    config = alembic_config("sqlite:///unused.db")

    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")

    assert "recipes" in table_names(engine)
    assert not Path("unused.db").exists()
    engine.dispose()
