from app.models import Ingredient, MealTime, RecipeInput
from app.store import RecipeStore


def names(recipes) -> list[str]:
    return [r.name for r in recipes]


def test_seed_covers_all_meal_times(seeded_store: RecipeStore) -> None:
    recipes = seeded_store.list()
    assert len(recipes) >= 4
    assert {m for r in recipes for m in r.meal_times} == set(MealTime)


def test_list_sorts_by_updated_at_descending(seeded_store: RecipeStore) -> None:
    times = [r.updated_at for r in seeded_store.list()]
    assert times == sorted(times, reverse=True)


def test_search_matches_name_and_ingredient(seeded_store: RecipeStore) -> None:
    assert "바나나 오트밀 죽" in names(seeded_store.list(search="바나나"))
    assert names(seeded_store.list(search="브로콜리")) == ["닭안심 브로콜리 죽"]


def test_search_is_case_insensitive_and_trimmed(store: RecipeStore) -> None:
    store.create(RecipeInput(name="Apple Puree"))
    assert names(store.list(search="  apple ")) == ["Apple Puree"]


def test_blank_search_matches_everything(seeded_store: RecipeStore) -> None:
    assert len(seeded_store.list(search="   ")) == len(seeded_store.list())


def test_filter_by_meal_time(seeded_store: RecipeStore) -> None:
    snacks = seeded_store.list(meal_time=MealTime.SNACK)
    assert snacks
    assert all(MealTime.SNACK in r.meal_times for r in snacks)


def test_search_and_filter_combine(seeded_store: RecipeStore) -> None:
    result = seeded_store.list(search="죽", meal_time=MealTime.BREAKFAST)
    assert names(result) == ["바나나 오트밀 죽"]


def test_create_sets_id_and_equal_timestamps(store: RecipeStore) -> None:
    recipe = store.create(RecipeInput(name="감자 미음"))
    assert recipe.id
    assert recipe.created_at == recipe.updated_at
    assert recipe.ingredients == []
    assert recipe.instructions == recipe.servings == recipe.notes == ""


def test_update_keeps_id_and_created_at(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="감자 미음"))
    updated = store.update(
        created.id,
        RecipeInput(
            name="감자 당근 미음",
            ingredients=[Ingredient(name="당근", amount="20g")],
        ),
    )
    assert updated is not None
    assert updated.id == created.id
    assert updated.created_at == created.created_at
    assert updated.updated_at > created.updated_at
    assert store.list()[0].name == "감자 당근 미음"


def test_update_unknown_id_returns_none(store: RecipeStore) -> None:
    assert store.update("nope", RecipeInput(name="x")) is None


def test_delete_is_idempotent(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="감자 미음"))
    store.delete(created.id)
    store.delete(created.id)
    assert store.get(created.id) is None


def test_returned_recipes_are_copies(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="감자 미음"))
    created.ingredients.append(Ingredient(name="변경", amount=""))
    assert store.get(created.id).ingredients == []
