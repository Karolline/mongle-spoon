"""Recipe store backed by SQLAlchemy. Search, meal-time filtering, and sorting live here."""

import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from sqlalchemy import Engine, exists, func, select
from sqlalchemy.orm import sessionmaker

from app.db import IngredientRow, MealTimeRow, RecipeRow, make_engine
from app.models import Ingredient, MealTime, Recipe, RecipeInput

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


class RecipeStore:
    def __init__(self, engine: Engine | None = None, clock: Clock = utc_now) -> None:
        self._engine = engine or make_engine()
        self._sessions = sessionmaker(self._engine, expire_on_commit=False)
        self._clock = clock

    def list(
        self, search: str = "", meal_time: MealTime | None = None
    ) -> list[Recipe]:
        stmt = select(RecipeRow)
        query = search.strip().lower()
        if query:
            stmt = stmt.where(
                func.lower(RecipeRow.name).contains(query, autoescape=True)
                | exists().where(
                    IngredientRow.recipe_id == RecipeRow.id,
                    func.lower(IngredientRow.name).contains(query, autoescape=True),
                )
            )
        if meal_time is not None:
            stmt = stmt.where(
                exists().where(
                    MealTimeRow.recipe_id == RecipeRow.id,
                    MealTimeRow.meal_time == meal_time.value,
                )
            )
        stmt = stmt.order_by(RecipeRow.updated_at.desc(), RecipeRow.id)
        with self._sessions() as session:
            return [_to_model(row) for row in session.scalars(stmt)]

    def get(self, recipe_id: str) -> Recipe | None:
        with self._sessions() as session:
            row = session.get(RecipeRow, recipe_id)
            return _to_model(row) if row else None

    def create(self, data: RecipeInput) -> Recipe:
        now = self._clock()
        return self.add(
            Recipe(id=str(uuid.uuid4()), created_at=now, updated_at=now, **data.model_dump())
        )

    def update(self, recipe_id: str, data: RecipeInput) -> Recipe | None:
        with self._sessions.begin() as session:
            row = session.get(RecipeRow, recipe_id)
            if row is None:
                return None
            _fill_row(row, data)
            row.updated_at = self._clock()
            session.flush()
            return _to_model(row)

    def delete(self, recipe_id: str) -> None:
        """Idempotent: deleting an unknown id is a no-op."""
        with self._sessions.begin() as session:
            row = session.get(RecipeRow, recipe_id)
            if row is not None:
                session.delete(row)

    def add(self, recipe: Recipe) -> Recipe:
        """Insert a recipe as-is, keeping its id and timestamps. Used for seeding."""
        with self._sessions.begin() as session:
            row = RecipeRow(
                id=recipe.id, created_at=recipe.created_at, updated_at=recipe.updated_at
            )
            _fill_row(row, recipe)
            session.add(row)
            session.flush()
            return _to_model(row)

    def is_empty(self) -> bool:
        with self._sessions() as session:
            return session.scalar(select(func.count()).select_from(RecipeRow)) == 0


def _fill_row(row: RecipeRow, data: RecipeInput | Recipe) -> None:
    row.name = data.name
    row.instructions = data.instructions
    row.servings = data.servings
    row.notes = data.notes
    row.ingredients = [
        IngredientRow(position=i, name=ing.name, amount=ing.amount)
        for i, ing in enumerate(data.ingredients)
    ]
    row.meal_times = [
        MealTimeRow(position=i, meal_time=mt.value) for i, mt in enumerate(data.meal_times)
    ]


def _to_model(row: RecipeRow) -> Recipe:
    return Recipe(
        id=row.id,
        name=row.name,
        ingredients=[Ingredient(name=i.name, amount=i.amount) for i in row.ingredients],
        instructions=row.instructions,
        servings=row.servings,
        meal_times=[MealTime(m.meal_time) for m in row.meal_times],
        notes=row.notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def seed(store: RecipeStore, now: datetime | None = None) -> None:
    """Fill the store with sample recipes covering every meal time."""
    now = now or utc_now()

    def days_ago(days: int) -> datetime:
        return now - timedelta(days=days)

    samples = [
        (
            "소고기 애호박 미음",
            [("쌀가루", "20g"), ("소고기", "15g"), ("애호박", "10g"), ("물", "200ml")],
            "소고기를 핏물을 뺀 뒤 잘게 다지고, 애호박은 껍질과 씨를 제거해 곱게 다집니다.\n"
            "냄비에 물과 쌀가루를 넣고 약불에서 저어가며 끓이다가 재료를 넣고 5분 더 끓입니다.",
            "3~4회분",
            [MealTime.BREAKFAST, MealTime.LUNCH_DINNER],
            "체에 한 번 걸러주면 훨씬 부드러워요.",
            20,
            1,
        ),
        (
            "단호박 고구마 매시",
            [("단호박", "1/4개"), ("고구마", "1/2개"), ("분유물", "2큰술")],
            "단호박과 고구마를 쪄서 껍질을 벗기고, 분유물을 조금씩 넣어가며 곱게 으깹니다.",
            "2회분",
            [MealTime.SNACK],
            "",
            18,
            3,
        ),
        (
            "닭안심 브로콜리 죽",
            [("불린 쌀", "30g"), ("닭안심", "20g"), ("브로콜리", "10g"), ("물", "250ml")],
            "닭안심은 삶아 결대로 찢어 다지고, 브로콜리는 꽃 부분만 데쳐 다집니다.\n"
            "불린 쌀과 물을 넣고 끓이다가 재료를 넣어 걸쭉해질 때까지 저어줍니다.",
            "3회분",
            [MealTime.LUNCH_DINNER],
            "브로콜리는 줄기를 빼고 사용해요.",
            15,
            6,
        ),
        (
            "바나나 오트밀 죽",
            [("오트밀", "2큰술"), ("바나나", "1/2개"), ("물", "100ml")],
            "오트밀을 물에 넣고 약불에서 3분 끓인 뒤, 으깬 바나나를 넣고 한소끔 더 끓입니다.",
            "1~2회분",
            [MealTime.BREAKFAST, MealTime.SNACK],
            "",
            12,
            9,
        ),
        (
            "두부 새송이 무름",
            [("두부", "40g"), ("새송이버섯", "10g"), ("다시물", "100ml")],
            "두부는 끓는 물에 살짝 데쳐 으깨고, 새송이버섯은 곱게 다져 다시물에 푹 끓입니다.",
            "2~3회분",
            [MealTime.LUNCH_DINNER, MealTime.SNACK],
            "간은 하지 않아요.",
            10,
            14,
        ),
    ]

    for name, ingredients, instructions, servings, meal_times, notes, created, updated in samples:
        store.add(
            Recipe(
                id=str(uuid.uuid4()),
                name=name,
                ingredients=[Ingredient(name=n, amount=a) for n, a in ingredients],
                instructions=instructions,
                servings=servings,
                meal_times=meal_times,
                notes=notes,
                created_at=days_ago(created),
                updated_at=days_ago(updated),
            )
        )
