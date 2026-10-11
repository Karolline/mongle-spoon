"""Bring a database's tables up to date (`alembic upgrade head`).

The dev server and the Docker image run this before starting the app, and
copy_db runs it on its target. Like the app, it migrates DATABASE_URL unless
given a URL.

Usage (inside backend/): uv run python -m app.migrate
"""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, create_engine, inspect

from app.db import database_url, normalize_url

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"
# The first migration: the tables make_engine() created before Alembic.
# Existing databases are stamped with it, so it must never change.
BASELINE = "f9e81a5676ed"


class UnstampedDatabaseError(RuntimeError):
    pass


def alembic_config(url: str | None = None) -> Config:
    config = Config(ALEMBIC_INI)
    if url is not None:
        config.set_main_option("sqlalchemy.url", url)
    return config


def check_stamped(connection: Connection) -> None:
    """Refuse a database whose tables predate Alembic but aren't stamped.

    Upgrading it would fail halfway with "table already exists"; say what to
    do instead.
    """
    tables = inspect(connection).get_table_names()
    if "recipes" in tables and "alembic_version" not in tables:
        raise UnstampedDatabaseError(
            "This database has tables from before Alembic. Mark them as the "
            f"baseline first: uv run alembic stamp {BASELINE} "
            "(with DATABASE_URL set to this database)."
        )


def upgrade(url: str | None = None, connection: Connection | None = None) -> None:
    """Apply every migration the database doesn't have yet.

    Pass an open connection for in-memory SQLite, where a new connection would
    be a new, empty database.
    """
    config = alembic_config(url)
    if connection is not None:
        check_stamped(connection)
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        return
    engine = create_engine(normalize_url(url or database_url()))
    try:
        with engine.connect() as conn:
            check_stamped(conn)
    finally:
        engine.dispose()
    command.upgrade(config, "head")


def main() -> None:
    try:
        upgrade()
    except UnstampedDatabaseError as error:
        raise SystemExit(str(error))


if __name__ == "__main__":
    main()
