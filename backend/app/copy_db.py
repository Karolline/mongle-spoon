"""Copy every recipe from one database into another, empty one.

Keeps ids and timestamps. Used to move the local SQLite data to production.

Usage (inside backend/):
    uv run python -m app.copy_db TARGET_URL                 # from ./mongle_spoon.db
    uv run python -m app.copy_db TARGET_URL --source URL
"""

import argparse

from app.db import DEFAULT_DATABASE_URL, make_engine
from app.store import RecipeStore


def copy_recipes(source: RecipeStore, target: RecipeStore) -> int:
    """Copy all recipes into `target` and return how many were copied.

    Refuses to touch a target that already has recipes, so running it twice
    can't create duplicates or overwrite anything.
    """
    if not target.is_empty():
        raise ValueError("target database already has recipes")
    return len(target.add_all(source.list()))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("target", help="database URL to copy into (must be empty)")
    parser.add_argument(
        "--source",
        default=DEFAULT_DATABASE_URL,
        help=f"database URL to copy from (default: {DEFAULT_DATABASE_URL})",
    )
    args = parser.parse_args()

    source = RecipeStore(engine=make_engine(args.source))
    target = RecipeStore(engine=make_engine(args.target))
    try:
        count = copy_recipes(source, target)
    except ValueError as error:
        raise SystemExit(f"Nothing copied: {error}.")
    # Don't echo the target URL: it contains the database password.
    print(f"Copied {count} recipes.")


if __name__ == "__main__":
    main()
