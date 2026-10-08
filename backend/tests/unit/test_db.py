import pytest

from app.db import normalize_url


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        (
            "postgresql://u:p@ep-x.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
            "postgresql+psycopg://u:p@ep-x.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
        ),
        ("postgres://u:p@localhost:5432/db", "postgresql+psycopg://u:p@localhost:5432/db"),
        ("postgresql+psycopg://u:p@localhost/db", "postgresql+psycopg://u:p@localhost/db"),
        ("sqlite:///./mongle_spoon.db", "sqlite:///./mongle_spoon.db"),
        ("sqlite://", "sqlite://"),
    ],
)
def test_normalize_url_picks_psycopg_for_postgres(url: str, expected: str) -> None:
    assert normalize_url(url) == expected
