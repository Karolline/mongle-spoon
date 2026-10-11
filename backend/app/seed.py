"""Insert the sample recipes into an empty database.

Usage (inside backend/): uv run python -m app.seed
"""

from sqlalchemy import inspect

from app.db import database_url, make_engine
from app.store import RecipeStore, seed


def main() -> None:
    engine = make_engine()
    if not inspect(engine).has_table("recipes"):
        raise SystemExit(
            "The database has no tables yet. Create them first: "
            "uv run python -m app.migrate"
        )
    store = RecipeStore(engine=engine)
    if not store.is_empty():
        print("Database already has recipes; nothing seeded.")
        return
    seed(store)
    print(f"Seeded sample recipes into {database_url()}")


if __name__ == "__main__":
    main()
