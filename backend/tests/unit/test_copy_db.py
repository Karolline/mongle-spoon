import pytest

from app import copy_db
from app.copy_db import copy_recipes
from app.db import make_engine
from app.models import Ingredient, RecipeInput
from app.store import RecipeStore, seed
from tests.conftest import START, fresh_engine


@pytest.fixture
def local_store() -> RecipeStore:
    """The source: a seeded SQLite database, like the local mongle_spoon.db."""
    store = RecipeStore(engine=fresh_engine("sqlite://"))
    seed(store, now=START)
    return store


def test_copies_every_recipe_unchanged(local_store: RecipeStore, store: RecipeStore) -> None:
    assert copy_recipes(local_store, store) == len(local_store.list())
    assert store.list() == local_store.list()


def test_target_still_accepts_new_recipes(local_store: RecipeStore, store: RecipeStore) -> None:
    copy_recipes(local_store, store)
    created = store.create(
        RecipeInput(name="감자 미음", ingredients=[Ingredient(name="감자", amount="30g")])
    )
    assert store.get(created.id) == created


def test_refuses_target_with_recipes(local_store: RecipeStore, store: RecipeStore) -> None:
    existing = store.create(RecipeInput(name="감자 미음"))
    with pytest.raises(ValueError):
        copy_recipes(local_store, store)
    assert store.list() == [existing]


def test_empty_source_copies_nothing(store: RecipeStore) -> None:
    empty = RecipeStore(engine=fresh_engine("sqlite://"))
    assert copy_recipes(empty, store) == 0
    assert store.is_empty()


def test_main_creates_the_tables_of_a_new_target(tmp_path, monkeypatch, capsys) -> None:
    source_url = f"sqlite:///{tmp_path / 'local.db'}"
    target_url = f"sqlite:///{tmp_path / 'new.db'}"
    seed(RecipeStore(engine=fresh_engine(source_url)), now=START)
    monkeypatch.setattr("sys.argv", ["copy_db", target_url, "--source", source_url])

    copy_db.main()

    source = RecipeStore(engine=make_engine(source_url))
    target = RecipeStore(engine=make_engine(target_url))
    assert target.list() == source.list()
    assert f"Copied {len(source.list())} recipes." in capsys.readouterr().out
