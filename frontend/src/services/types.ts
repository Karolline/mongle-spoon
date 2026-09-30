export type MealTime = "breakfast" | "lunch_dinner" | "snack";

export const MEAL_TIMES: MealTime[] = ["breakfast", "lunch_dinner", "snack"];

export const MEAL_TIME_LABELS: Record<MealTime, string> = {
  breakfast: "아침",
  lunch_dinner: "점심·저녁",
  snack: "간식",
};

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  instructions: string;
  servings: string;
  mealTimes: MealTime[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type RecipeInput = Omit<Recipe, "id" | "createdAt" | "updatedAt">;

export interface ListRecipesParams {
  search?: string;
  mealTime?: MealTime | null;
}

export interface RecipeService {
  listRecipes(params?: ListRecipesParams): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | null>;
  createRecipe(input: RecipeInput): Promise<Recipe>;
  updateRecipe(id: string, input: RecipeInput): Promise<Recipe>;
  deleteRecipe(id: string): Promise<void>;
}
