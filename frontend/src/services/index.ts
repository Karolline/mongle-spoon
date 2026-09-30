import { mockRecipeService } from "./mockRecipeService";
import type { RecipeService } from "./types";

/**
 * Single entry point for every backend call.
 * Swap this binding for an HTTP implementation when the FastAPI backend lands.
 */
export const recipeService: RecipeService = mockRecipeService;

export * from "./types";
