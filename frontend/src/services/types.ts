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
  /** When the recipe was pinned to the top of the list; null when not pinned. */
  pinnedAt: string | null;
  /** The day the recipe was last made (`YYYY-MM-DD`, no time zone); null when never recorded. */
  lastMadeOn: string | null;
}

export type RecipeInput = Omit<
  Recipe,
  "id" | "createdAt" | "updatedAt" | "pinnedAt" | "lastMadeOn"
>;

export interface ListRecipesParams {
  search?: string;
  mealTime?: MealTime | null;
}

/**
 * Lists put pinned recipes first (most recently pinned first), then the rest
 * by the later of the day last made (as midnight UTC) and the last update,
 * most recent first, then by most recently updated, then by id.
 *
 * Reading is public. Every other method that changes a recipe needs the admin password:
 * call `unlock` first. Writes rejected for a wrong password throw an ApiError
 * with status 401 (see `isUnauthorized`) and forget the stored password.
 */
export interface RecipeService {
  listRecipes(params?: ListRecipesParams): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | null>;
  createRecipe(input: RecipeInput): Promise<Recipe>;
  updateRecipe(id: string, input: RecipeInput): Promise<Recipe>;
  deleteRecipe(id: string): Promise<void>;
  /** Pins to the top of the list. Doesn't change `updatedAt`. */
  pinRecipe(id: string): Promise<Recipe>;
  /** Unpins. Doesn't change `updatedAt`. */
  unpinRecipe(id: string): Promise<Recipe>;
  /**
   * Records the day the recipe was last made (`YYYY-MM-DD`, replacing the
   * previous one). Doesn't change `updatedAt`.
   */
  setLastMade(id: string, day: string): Promise<Recipe>;
  /** Clears the day the recipe was last made. Doesn't change `updatedAt`. */
  clearLastMade(id: string): Promise<Recipe>;

  /** True when a password is remembered, so writes will send it. */
  isUnlocked(): boolean;
  /** Checks the password with the server and remembers it if correct. */
  unlock(password: string): Promise<boolean>;
  /** Forgets the remembered password. */
  lock(): void;
}
