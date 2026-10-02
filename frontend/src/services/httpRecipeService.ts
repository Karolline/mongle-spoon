import type {
  ListRecipesParams,
  Recipe,
  RecipeInput,
  RecipeService,
} from "./types";

/**
 * HTTP implementation of the recipe service, talking to the FastAPI backend.
 * The contract is `openapi.yaml` at the repo root. Search, filtering and
 * sorting happen on the server.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type FetchFn = typeof fetch;

export function createHttpRecipeService(
  baseUrl: string,
  fetchFn: FetchFn = (...args) => fetch(...args),
): RecipeService {
  const root = baseUrl.replace(/\/+$/, "");

  async function request(path: string, init?: RequestInit): Promise<Response> {
    return fetchFn(`${root}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  }

  async function fail(response: Response): Promise<never> {
    let detail = response.statusText;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "detail" in body) {
        detail =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      // Non-JSON error body: keep the status text.
    }
    throw new ApiError(
      response.status,
      `Request failed (${response.status}): ${detail}`,
    );
  }

  async function json<T>(response: Response): Promise<T> {
    if (!response.ok) return fail(response);
    return (await response.json()) as T;
  }

  function recipePath(id: string): string {
    return `/recipes/${encodeURIComponent(id)}`;
  }

  return {
    async listRecipes(params: ListRecipesParams = {}) {
      const query = new URLSearchParams();
      const search = params.search?.trim();
      if (search) query.set("search", search);
      if (params.mealTime) query.set("mealTime", params.mealTime);
      const qs = query.toString();
      return json<Recipe[]>(await request(`/recipes${qs ? `?${qs}` : ""}`));
    },

    async getRecipe(id: string) {
      const response = await request(recipePath(id));
      if (response.status === 404) return null;
      return json<Recipe>(response);
    },

    async createRecipe(input: RecipeInput) {
      return json<Recipe>(
        await request("/recipes", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
    },

    async updateRecipe(id: string, input: RecipeInput) {
      return json<Recipe>(
        await request(recipePath(id), {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      );
    },

    async deleteRecipe(id: string) {
      const response = await request(recipePath(id), { method: "DELETE" });
      if (!response.ok) await fail(response);
    },
  };
}
