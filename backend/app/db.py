"""Database tables and engine setup (SQLAlchemy).

Only portable column types and queries are used, so switching DATABASE_URL
to another database (e.g. Postgres) needs no code changes, just a driver.
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
    name: Mapped[str] = mapped_column(String(200))
    instructions: Mapped[str] = mapped_column(Text, default="")
    servings: Mapped[str] = mapped_column(String(100), default="")
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
    name: Mapped[str] = mapped_column(String(200))
    amount: Mapped[str] = mapped_column(String(100))


class MealTimeRow(Base):
    __tablename__ = "recipe_meal_times"

    recipe_id: Mapped[str] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True
    )
    meal_time: Mapped[str] = mapped_column(String(20), primary_key=True)
    position: Mapped[int] = mapped_column(Integer)


def database_url() -> str:
    return os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)


def make_engine(url: str | None = None) -> Engine:
    """Create an engine and make sure the tables exist."""
    url = url or database_url()
    kwargs: dict = {}
    if url.startswith("sqlite"):
        # FastAPI runs sync endpoints in a thread pool.
        kwargs["connect_args"] = {"check_same_thread": False}
        if ":memory:" in url or url in ("sqlite://", "sqlite+pysqlite://"):
            # One shared connection, otherwise every connection gets its own empty DB.
            kwargs["poolclass"] = StaticPool
    engine = create_engine(url, **kwargs)
    Base.metadata.create_all(engine)
    return engine
