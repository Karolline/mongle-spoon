"""API schemas. JSON field names are camelCase to match the frontend types."""

from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class MealTime(StrEnum):
    BREAKFAST = "breakfast"
    LUNCH_DINNER = "lunch_dinner"
    SNACK = "snack"


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class Ingredient(ApiModel):
    name: str
    amount: str


class RecipeInput(ApiModel):
    """Editable fields, sent on create and update. Only `name` is required."""

    name: str = Field(min_length=1)
    ingredients: list[Ingredient] = Field(default_factory=list)
    instructions: str = ""
    servings: str = ""
    meal_times: list[MealTime] = Field(
        default_factory=list, json_schema_extra={"uniqueItems": True}
    )
    notes: str = ""
    # Unit of the leftover amount (e.g. "큐브"); "" means the default ("개").
    leftover_unit: str = ""

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("name must not be blank")
        return value

    @field_validator("meal_times")
    @classmethod
    def meal_times_unique(cls, value: list[MealTime]) -> list[MealTime]:
        if len(set(value)) != len(value):
            raise ValueError("mealTimes must not contain duplicates")
        return value


class Recipe(ApiModel):
    id: str
    name: str
    ingredients: list[Ingredient]
    instructions: str
    servings: str
    meal_times: list[MealTime]
    notes: str
    created_at: datetime
    updated_at: datetime
    pinned_at: datetime | None = None
    last_made_on: date | None = None
    leftover: int | None = None
    leftover_unit: str = ""


class LastMadeInput(ApiModel):
    """The day a recipe was cooked. The client picks it, in the user's own time zone."""

    last_made_on: date


LEFTOVER_MAX = 999


class LeftoverInput(ApiModel):
    """How much of the made batch is left: a whole number from 0 to 999."""

    # strict: reject 2.5 and "3" instead of coercing them.
    leftover: int = Field(ge=0, le=LEFTOVER_MAX, strict=True)
