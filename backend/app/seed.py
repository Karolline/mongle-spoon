"""Insert the sample recipes into an empty database.

Usage (inside backend/): uv run python -m app.seed
"""

from app.db import database_url
from app.store import RecipeStore, seed


def main() -> None:
    store = RecipeStore()
    if not store.is_empty():
        print("Database already has recipes; nothing seeded.")
        return
    seed(store)
    print(f"Seeded sample recipes into {database_url()}")


if __name__ == "__main__":
    main()
