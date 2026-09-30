from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.auth import require_access
from app.models import MealTime, Recipe, RecipeInput
from app.store import RecipeStore

router = APIRouter(
    prefix="/recipes",
    tags=["recipes"],
    dependencies=[Depends(require_access)],
)


def get_store(request: Request) -> RecipeStore:
    return request.app.state.store


StoreDep = Annotated[RecipeStore, Depends(get_store)]

NOT_FOUND = {404: {"description": "No recipe with this id."}}


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")


@router.get("", response_model=list[Recipe], operation_id="listRecipes")
def list_recipes(
    store: StoreDep,
    search: str = "",
    meal_time: Annotated[MealTime | None, Query(alias="mealTime")] = None,
) -> list[Recipe]:
    return store.list(search=search, meal_time=meal_time)


@router.post(
    "",
    response_model=Recipe,
    status_code=status.HTTP_201_CREATED,
    operation_id="createRecipe",
)
def create_recipe(data: RecipeInput, store: StoreDep) -> Recipe:
    return store.create(data)


@router.get(
    "/{recipe_id}", response_model=Recipe, responses=NOT_FOUND, operation_id="getRecipe"
)
def get_recipe(recipe_id: str, store: StoreDep) -> Recipe:
    recipe = store.get(recipe_id)
    if recipe is None:
        raise _not_found()
    return recipe


@router.put(
    "/{recipe_id}",
    response_model=Recipe,
    responses=NOT_FOUND,
    operation_id="updateRecipe",
)
def update_recipe(recipe_id: str, data: RecipeInput, store: StoreDep) -> Recipe:
    recipe = store.update(recipe_id, data)
    if recipe is None:
        raise _not_found()
    return recipe


@router.delete(
    "/{recipe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    operation_id="deleteRecipe",
)
def delete_recipe(recipe_id: str, store: StoreDep) -> Response:
    store.delete(recipe_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
