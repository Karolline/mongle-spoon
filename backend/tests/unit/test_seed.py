import pytest

from app import seed
from app.db import make_engine
from app.migrate import upgrade
from app.store import RecipeStore


def test_refuses_a_database_without_tables(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'new.db'}")

    with pytest.raises(SystemExit) as exc:
        seed.main()

    assert "python -m app.migrate" in str(exc.value)


def test_seeds_a_migrated_database(tmp_path, monkeypatch) -> None:
    url = f"sqlite:///{tmp_path / 'new.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    upgrade()

    seed.main()

    assert not RecipeStore(engine=make_engine(url)).is_empty()
