import { describe, expect, it, vi } from "vitest";
import { ApiError, createHttpRecipeService } from "./httpRecipeService";
import type { Recipe, RecipeInput } from "./types";

const recipe: Recipe = {
  id: "r1",
  name: "감자 미음",
  ingredients: [{ name: "감자", amount: "1/2개" }],
  instructions: "",
  servings: "",
  mealTimes: ["breakfast"],
  notes: "",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const input: RecipeInput = {
  name: recipe.name,
  ingredients: recipe.ingredients,
  instructions: "",
  servings: "",
  mealTimes: ["breakfast"],
  notes: "",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup(response: Response) {
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
  const service = createHttpRecipeService("http://api.test/", fetchFn);
  const call = (i = 0) => {
    const [url, init] = fetchFn.mock.calls[i]!;
    return { url: String(url), init: init ?? {} };
  };
  return { service, fetchFn, call };
}

describe("httpRecipeService", () => {
  it("lists recipes without query params by default", async () => {
    const { service, call } = setup(jsonResponse([recipe]));
    expect(await service.listRecipes()).toEqual([recipe]);
    expect(call().url).toBe("http://api.test/recipes");
    expect(call().init.method).toBeUndefined();
  });

  it("sends trimmed search and meal time as query params", async () => {
    const { service, call } = setup(jsonResponse([]));
    await service.listRecipes({ search: "  당근 ", mealTime: "snack" });
    const url = new URL(call().url);
    expect(url.pathname).toBe("/recipes");
    expect(url.searchParams.get("search")).toBe("당근");
    expect(url.searchParams.get("mealTime")).toBe("snack");
  });

  it("omits blank search and null meal time", async () => {
    const { service, call } = setup(jsonResponse([]));
    await service.listRecipes({ search: "   ", mealTime: null });
    expect(call().url).toBe("http://api.test/recipes");
  });

  it("gets a recipe by encoded id", async () => {
    const { service, call } = setup(jsonResponse(recipe));
    expect(await service.getRecipe("a/b")).toEqual(recipe);
    expect(call().url).toBe("http://api.test/recipes/a%2Fb");
  });

  it("returns null when a recipe is not found", async () => {
    const { service } = setup(jsonResponse({ detail: "Recipe not found" }, 404));
    expect(await service.getRecipe("missing")).toBeNull();
  });

  it("creates a recipe with a JSON POST", async () => {
    const { service, call } = setup(jsonResponse(recipe, 201));
    expect(await service.createRecipe(input)).toEqual(recipe);
    expect(call().url).toBe("http://api.test/recipes");
    expect(call().init.method).toBe("POST");
    expect(JSON.parse(call().init.body as string)).toEqual(input);
    expect(call().init.headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });

  it("updates a recipe with a JSON PUT", async () => {
    const { service, call } = setup(jsonResponse(recipe));
    expect(await service.updateRecipe("r1", input)).toEqual(recipe);
    expect(call().url).toBe("http://api.test/recipes/r1");
    expect(call().init.method).toBe("PUT");
    expect(JSON.parse(call().init.body as string)).toEqual(input);
  });

  it("throws ApiError when updating an unknown recipe", async () => {
    const { service } = setup(jsonResponse({ detail: "Recipe not found" }, 404));
    const error = await service.updateRecipe("missing", input).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toContain("Recipe not found");
  });

  it("deletes a recipe", async () => {
    const { service, call } = setup(new Response(null, { status: 204 }));
    await expect(service.deleteRecipe("r1")).resolves.toBeUndefined();
    expect(call().url).toBe("http://api.test/recipes/r1");
    expect(call().init.method).toBe("DELETE");
  });

  it("throws ApiError on validation errors with structured detail", async () => {
    const { service } = setup(
      jsonResponse({ detail: [{ msg: "name must not be blank" }] }, 422),
    );
    const error = await service.createRecipe(input).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.message).toContain("name must not be blank");
  });

  it("throws ApiError on non-JSON server errors", async () => {
    const { service } = setup(
      new Response("boom", { status: 500, statusText: "Internal Server Error" }),
    );
    const error = await service.listRecipes().catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
  });

  it("propagates network failures", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));
    const service = createHttpRecipeService("http://api.test", fetchFn);
    await expect(service.listRecipes()).rejects.toThrow("offline");
  });
});
