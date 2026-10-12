import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Engine, create_engine, inspect, text

from app.db import Base, normalize_url
from app.migrate import BASELINE, UnstampedDatabaseError, alembic_config, upgrade
from app.store import RecipeStore
from tests.conftest import TEST_DATABASE_URL, drop_everything

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


def build_pre_alembic_tables(url: str) -> None:
    """The tables make_engine() used to create before Alembic (the baseline), unstamped."""
    command.upgrade(alembic_config(url), BASELINE)
    engine = create_engine(normalize_url(url))
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE alembic_version"))
    engine.dispose()


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
    build_pre_alembic_tables(url)
    engine = create_engine(normalize_url(url))
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO recipes (id, name, instructions, servings, notes,"
                " created_at, updated_at) VALUES ('r1', '감자 미음', '', '', '',"
                " '2026-09-01 09:00:00', '2026-09-02 09:00:00')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO recipe_meal_times (recipe_id, meal_time, position)"
                " VALUES ('r1', 'breakfast', 0)"
            )
        )
    config = alembic_config(url)

    command.stamp(config, BASELINE)
    command.upgrade(config, "head")

    assert differences_from_models(engine) == []
    recipe = RecipeStore(engine=engine).get("r1")
    assert recipe is not None
    assert recipe.name == "감자 미음"
    assert recipe.meal_times == ["breakfast"]
    assert recipe.pinned_at is None
    assert recipe.last_made_on is None
    assert recipe.leftover is None
    assert recipe.leftover_unit == ""
    engine.dispose()


def test_the_previous_image_can_still_insert_after_upgrading(url):
    # Rolling back the image doesn't roll back the database: an insert that
    # doesn't name the newer columns must still work.
    command.upgrade(alembic_config(url), "head")
    engine = create_engine(normalize_url(url))
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO recipes (id, name, instructions, servings, notes,"
                " created_at, updated_at) VALUES ('r1', '감자 미음', '', '', '',"
                " '2026-09-01 09:00:00', '2026-09-02 09:00:00')"
            )
        )

    recipe = RecipeStore(engine=engine).get("r1")
    assert recipe is not None
    assert recipe.leftover is None
    assert recipe.leftover_unit == ""
    engine.dispose()


def test_upgrade_refuses_tables_from_before_alembic_that_are_not_stamped(url):
    build_pre_alembic_tables(url)
    engine = create_engine(normalize_url(url))

    with pytest.raises(UnstampedDatabaseError, match=f"alembic stamp {BASELINE}"):
        upgrade(url)

    assert "alembic_version" not in table_names(engine)
    engine.dispose()


def test_upgrade_reads_database_url(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'from-env.db'}"
    monkeypatch.setenv("DATABASE_URL", url)

    upgrade()

    engine = create_engine(url)
    assert differences_from_models(engine) == []
    engine.dispose()


def test_upgrade_uses_a_passed_connection(tmp_path, monkeypatch):
    # In-memory SQLite only works this way: a new connection would be a new DB.
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'unused.db'}")
    engine = create_engine("sqlite://")

    with engine.connect() as connection:
        upgrade(connection=connection)
        assert "recipes" in inspect(connection).get_table_names()

    assert not (tmp_path / "unused.db").exists()
    engine.dispose()
