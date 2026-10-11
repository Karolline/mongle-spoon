from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

ALEMBIC_INI = Path(__file__).parents[2] / "alembic.ini"


def alembic_config(url: str) -> Config:
    config = Config(ALEMBIC_INI)
    config.set_main_option("sqlalchemy.url", url)
    return config


def test_upgrade_records_the_version_in_the_database(tmp_path):
    url = f"sqlite:///{tmp_path / 'migrated.db'}"

    command.upgrade(alembic_config(url), "head")

    engine = create_engine(url)
    assert "alembic_version" in inspect(engine).get_table_names()
    engine.dispose()


def test_upgrade_uses_a_passed_connection(tmp_path):
    # In-memory SQLite only works this way: a new connection would be a new DB.
    engine = create_engine(f"sqlite:///{tmp_path / 'shared.db'}")
    config = alembic_config("sqlite:///unused.db")

    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")

    assert "alembic_version" in inspect(engine).get_table_names()
    assert not Path("unused.db").exists()
    engine.dispose()
