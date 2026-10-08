"""Database tables and engine setup (SQLAlchemy).

Only portable column types and queries are used, so the same code runs on
SQLite (local development, tests) and PostgreSQL (production, via psycopg).
User-entered text is stored as unbounded Text: SQLite ignores VARCHAR lengths
but PostgreSQL enforces them, so a length limit would only fail in production.
"""

import os
from datetime import UTC, datetime

from sqlalchemy import (
    DateTime,
    Engine,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.pool import StaticPool

DEFAULT_DATABASE_URL = "sqlite:///./mongle_spoon.db"


class UTCDateTime(TypeDecorator[datetime]):
    """Stores datetimes as naive UTC and always returns timezone-aware UTC.

    Some databases (SQLite) drop the timezone, so normalize on both sides.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("naive datetimes are not allowed")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


class Base(DeclarativeBase):
    pass


class RecipeRow(Base):
    __tablename__ = "recipes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    instructions: Mapped[str] = mapped_column(Text, default="")
    servings: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, index=True)

    ingredients: Mapped[list["IngredientRow"]] = relationship(
        order_by="IngredientRow.position",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    meal_times: Mapped[list["MealTimeRow"]] = relationship(
        order_by="MealTimeRow.position",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class IngredientRow(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recipe_id: Mapped[str] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(Text)
    amount: Mapped[str] = mapped_column(Text)


class MealTimeRow(Base):
    __tablename__ = "recipe_meal_times"

    recipe_id: Mapped[str] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True
    )
    meal_time: Mapped[str] = mapped_column(String(20), primary_key=True)
    position: Mapped[int] = mapped_column(Integer)


def database_url() -> str:
    return os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)


def normalize_url(url: str) -> str:
    """Use the psycopg (v3) driver for plain PostgreSQL URLs.

    Hosts like Neon hand out `postgresql://...` (or `postgres://...`), which
    SQLAlchemy would map to psycopg2. URLs that name a driver are kept as-is.
    """
    for scheme in ("postgresql://", "postgres://"):
        if url.startswith(scheme):
            return "postgresql+psycopg://" + url.removeprefix(scheme)
    return url


def make_engine(url: str | None = None) -> Engine:
    """Create an engine and make sure the tables exist."""
    url = normalize_url(url or database_url())
    kwargs: dict = {}
    if url.startswith("postgresql"):
        # Hosted Postgres (e.g. Neon) closes idle connections; check before reuse.
        kwargs["pool_pre_ping"] = True
    if url.startswith("sqlite"):
        # FastAPI runs sync endpoints in a thread pool.
        kwargs["connect_args"] = {"check_same_thread": False}
        if ":memory:" in url or url in ("sqlite://", "sqlite+pysqlite://"):
            # One shared connection, otherwise every connection gets its own empty DB.
            kwargs["poolclass"] = StaticPool
    engine = create_engine(url, **kwargs)
    Base.metadata.create_all(engine)
    return engine
