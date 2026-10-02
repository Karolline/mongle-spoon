import type {
  ListRecipesParams,
  Recipe,
  RecipeInput,
  RecipeService,
} from "./types";

import { ApiError } from "./errors";

export { ApiError };

/**
 * HTTP implementation of the recipe service, talking to the FastAPI backend.
 * The contract is `openapi.yaml` at the repo root. Search, filtering and
 * sorting happen on the server.
 *
 * The admin password is remembered in `passwordStorage` (localStorage in the
 * browser) and sent as `Authorization: Bearer <password>` on writes only.
 */

type FetchFn = typeof fetch;

export type PasswordStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const PASSWORD_STORAGE_KEY = "mongle-spoon.admin-password";

/** localStorage, or nothing when the browser blocks it (e.g. private mode). */
function browserStorage(): PasswordStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

// HTTP headers can only carry printable ASCII.
const HEADER_SAFE = /^[\x20-\x7E]+$/;

export function createHttpRecipeService(
  baseUrl: string,
  fetchFn: FetchFn = (...args) => fetch(...args),
  passwordStorage: PasswordStorage | null = browserStorage(),
): RecipeService {
  const root = baseUrl.replace(/\/+$/, "");
  let password = readPassword();

  function readPassword(): string | null {
    try {
      return passwordStorage?.getItem(PASSWORD_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  function remember(value: string | null) {
    password = value;
    try {
      if (value === null) passwordStorage?.removeItem(PASSWORD_STORAGE_KEY);
      else passwordStorage?.setItem(PASSWORD_STORAGE_KEY, value);
    } catch {
      // Storage unavailable: keep the password for this page only.
    }
  }

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

  /** A request that needs the admin password. A 401 forgets it. */
  async function write(path: string, init: RequestInit): Promise<Response> {
    const response = await request(path, {
      ...init,
      headers: password ? { Authorization: `Bearer ${password}` } : {},
    });
    if (response.status === 401) remember(null);
    return response;
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
        await write("/recipes", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
    },

    async updateRecipe(id: string, input: RecipeInput) {
      return json<Recipe>(
        await write(recipePath(id), {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      );
    },

    async deleteRecipe(id: string) {
      const response = await write(recipePath(id), { method: "DELETE" });
      if (!response.ok) await fail(response);
    },

    isUnlocked() {
      return password !== null;
    },

    async unlock(candidate: string) {
      if (!HEADER_SAFE.test(candidate)) return false;
      const response = await request("/auth/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${candidate}` },
      });
      if (response.status === 401) return false;
      if (!response.ok) await fail(response);
      remember(candidate);
      return true;
    },

    lock() {
      remember(null);
    },
  };
}
