from datetime import date

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


def test_pinned_recipes_come_first_most_recently_pinned_first(
    seeded_store: RecipeStore,
) -> None:
    unpinned = seeded_store.list()
    oldest, second_oldest = unpinned[-1], unpinned[-2]
    seeded_store.pin(second_oldest.id)
    seeded_store.pin(oldest.id)

    result = seeded_store.list()
    assert names(result[:2]) == [oldest.name, second_oldest.name]
    # The rest keep their usual updated_at order.
    assert names(result[2:]) == names(unpinned[:-2])


def test_pinned_recipes_still_follow_search_and_filter(seeded_store: RecipeStore) -> None:
    banana = seeded_store.list(search="바나나")[0]
    beef = seeded_store.list(search="소고기")[0]
    seeded_store.pin(banana.id)
    seeded_store.pin(beef.id)

    assert names(seeded_store.list(search="죽")) == [
        banana.name,
        *[n for n in names(seeded_store.list(search="죽")) if n != banana.name],
    ]
    assert beef.name not in names(seeded_store.list(meal_time=MealTime.SNACK))
    assert names(seeded_store.list(meal_time=MealTime.SNACK))[0] == banana.name


def test_pin_and_unpin_keep_updated_at(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="감자 미음"))
    assert created.pinned_at is None

    pinned = store.pin(created.id)
    assert pinned is not None
    assert pinned.pinned_at is not None
    assert pinned.updated_at == created.updated_at
    assert store.get(created.id) == pinned

    unpinned = store.unpin(created.id)
    assert unpinned is not None
    assert unpinned.pinned_at is None
    assert unpinned.updated_at == created.updated_at


def test_pinning_again_keeps_the_first_pin_time(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="감자 미음"))
    first = store.pin(created.id)
    again = store.pin(created.id)
    assert first is not None and again is not None
    assert again.pinned_at == first.pinned_at


def test_update_keeps_pin(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="감자 미음"))
    pinned = store.pin(created.id)
    updated = store.update(created.id, RecipeInput(name="감자 당근 미음"))
    assert updated is not None and pinned is not None
    assert updated.pinned_at == pinned.pinned_at


def test_pin_unknown_id_returns_none(store: RecipeStore) -> None:
    assert store.pin("nope") is None
    assert store.unpin("nope") is None


def test_recently_made_recipes_come_next_never_made_last(
    seeded_store: RecipeStore,
) -> None:
    by_updated = seeded_store.list()
    oldest, second_oldest = by_updated[-1], by_updated[-2]
    seeded_store.set_last_made(oldest.id, date(2026, 9, 3))
    seeded_store.set_last_made(second_oldest.id, date(2026, 9, 1))

    result = seeded_store.list()
    assert names(result[:2]) == [oldest.name, second_oldest.name]
    # Never made: the usual updated_at order.
    assert names(result[2:]) == names(by_updated[:-2])


def test_pinned_recipes_still_come_before_recently_made(
    seeded_store: RecipeStore,
) -> None:
    first, last = seeded_store.list()[0], seeded_store.list()[-1]
    seeded_store.set_last_made(first.id, date(2026, 9, 3))
    seeded_store.pin(last.id)

    assert names(seeded_store.list()[:2]) == [last.name, first.name]


def test_recipes_made_on_the_same_day_sort_by_updated_at(store: RecipeStore) -> None:
    older = store.create(RecipeInput(name="감자 미음"))
    newer = store.create(RecipeInput(name="당근 미음"))
    for recipe in (newer, older):
        store.set_last_made(recipe.id, date(2026, 9, 3))

    assert names(store.list()) == ["당근 미음", "감자 미음"]


def test_set_and_clear_last_made_keep_updated_at(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="감자 미음"))
    assert created.last_made_on is None

    made = store.set_last_made(created.id, date(2026, 9, 3))
    assert made is not None
    assert made.last_made_on == date(2026, 9, 3)
    assert made.updated_at == created.updated_at
    assert store.get(created.id) == made

    # Any day can be recorded, also an earlier one (to fix a mistake).
    earlier = store.set_last_made(created.id, date(2026, 8, 30))
    assert earlier is not None and earlier.last_made_on == date(2026, 8, 30)

    cleared = store.set_last_made(created.id, None)
    assert cleared is not None
    assert cleared.last_made_on is None
    assert cleared.updated_at == created.updated_at


def test_update_keeps_last_made(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="감자 미음"))
    store.set_last_made(created.id, date(2026, 9, 3))
    updated = store.update(created.id, RecipeInput(name="감자 당근 미음"))
    assert updated is not None
    assert updated.last_made_on == date(2026, 9, 3)


def test_set_last_made_unknown_id_returns_none(store: RecipeStore) -> None:
    assert store.set_last_made("nope", date(2026, 9, 3)) is None


def test_delete_is_idempotent(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="감자 미음"))
    store.delete(created.id)
    store.delete(created.id)
    assert store.get(created.id) is None


def test_returned_recipes_are_copies(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="감자 미음"))
    created.ingredients.append(Ingredient(name="변경", amount=""))
    assert store.get(created.id).ingredients == []


def test_update_with_same_meal_times_and_ingredients(store: RecipeStore) -> None:
    data = RecipeInput(
        name="감자 미음",
        ingredients=[Ingredient(name="감자", amount="1개")],
        meal_times=[MealTime.SNACK, MealTime.BREAKFAST],
    )
    created = store.create(data)
    updated = store.update(created.id, data)
    assert updated is not None
    assert updated.meal_times == [MealTime.SNACK, MealTime.BREAKFAST]
    assert updated.ingredients == data.ingredients


def test_ingredient_order_is_kept(store: RecipeStore) -> None:
    ingredients = [Ingredient(name=n, amount="") for n in ("다", "가", "나")]
    created = store.create(RecipeInput(name="x", ingredients=ingredients))
    assert store.get(created.id).ingredients == ingredients


def test_search_treats_like_wildcards_literally(store: RecipeStore) -> None:
    store.create(RecipeInput(name="감자 미음"))
    store.create(RecipeInput(name="100% 사과즙"))
    assert names(store.list(search="%")) == ["100% 사과즙"]
    assert names(store.list(search="_")) == []


def test_timestamps_are_timezone_aware(store: RecipeStore) -> None:
    created = store.create(RecipeInput(name="x"))
    fetched = store.get(created.id)
    assert fetched.created_at.tzinfo is not None
    assert fetched.created_at == created.created_at


def test_delete_removes_child_rows(store: RecipeStore) -> None:
    created = store.create(
        RecipeInput(
            name="x",
            ingredients=[Ingredient(name="감자", amount="")],
            meal_times=[MealTime.SNACK],
        )
    )
    store.delete(created.id)
    assert store.list(search="감자") == []
    assert store.list(meal_time=MealTime.SNACK) == []
    assert store.is_empty()


def test_data_persists_in_a_database_file(tmp_path) -> None:
    from app.db import make_engine
    from tests.conftest import fresh_engine

    url = f"sqlite:///{tmp_path / 'recipes.db'}"
    created = RecipeStore(engine=fresh_engine(url)).create(
        RecipeInput(name="감자 미음", meal_times=[MealTime.BREAKFAST])
    )
    reopened = RecipeStore(engine=make_engine(url))
    assert reopened.get(created.id) == created


def test_long_text_is_stored_in_full(store: RecipeStore) -> None:
    long = "가" * 1000
    created = store.create(
        RecipeInput(
            name=long,
            ingredients=[Ingredient(name=long, amount=long)],
            servings=long,
        )
    )
    fetched = store.get(created.id)
    assert fetched is not None
    assert fetched.name == long
    assert fetched.servings == long
    assert fetched.ingredients == [Ingredient(name=long, amount=long)]
