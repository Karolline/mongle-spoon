import { createHttpRecipeService } from "./httpRecipeService";
import { mockRecipeService } from "./mockRecipeService";
import type { RecipeService } from "./types";

/**
 * Single entry point for every backend call.
 * Uses the FastAPI backend at VITE_API_BASE_URL (default http://localhost:8000/api),
 * or the in-memory mock when VITE_USE_MOCK_API is "true" (always set in tests).
 */
const useMock = import.meta.env.VITE_USE_MOCK_API === "true";
const apiBaseUrl: string =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const recipeService: RecipeService = useMock
  ? mockRecipeService
  : createHttpRecipeService(apiBaseUrl);

export * from "./types";
export { ApiError, isUnauthorized } from "./errors";
