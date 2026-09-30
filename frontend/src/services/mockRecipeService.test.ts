import { beforeEach, describe, expect, it } from "vitest";
import { mockRecipeService, resetMockRecipes } from "./mockRecipeService";
import type { RecipeInput } from "./types";

const blank: RecipeInput = {
  name: "",
  ingredients: [],
  instructions: "",
  servings: "",
  mealTimes: [],
  notes: "",
};

describe("mockRecipeService", () => {
  beforeEach(() => {
    resetMockRecipes();
  });

  it("is seeded with recipes covering all three meal times", async () => {
    const all = await mockRecipeService.listRecipes();
    expect(all.length).toBeGreaterThanOrEqual(4);
    const mealTimes = new Set(all.flatMap((r) => r.mealTimes));
    expect(mealTimes).toEqual(
      new Set(["breakfast", "lunch_dinner", "snack"]),
    );
  });

  it("sorts by most recently updated first", async () => {
    const all = await mockRecipeService.listRecipes();
    const times = all.map((r) => new Date(r.updatedAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("searches by recipe name", async () => {
    const found = await mockRecipeService.listRecipes({ search: "바나나" });
    expect(found.map((r) => r.name)).toContain("바나나 오트밀 죽");
  });

  it("searches by ingredient name", async () => {
    const found = await mockRecipeService.listRecipes({ search: "브로콜리" });
    expect(found).toHaveLength(1);
    expect(found[0]!.name).toBe("닭안심 브로콜리 죽");
  });

  it("filters by meal time", async () => {
    const snacks = await mockRecipeService.listRecipes({ mealTime: "snack" });
    expect(snacks.length).toBeGreaterThan(0);
    expect(snacks.every((r) => r.mealTimes.includes("snack"))).toBe(true);
  });

  it("combines search and meal time filter", async () => {
    const result = await mockRecipeService.listRecipes({
      search: "죽",
      mealTime: "breakfast",
    });
    expect(result.map((r) => r.name)).toEqual(["바나나 오트밀 죽"]);
  });

  it("returns an empty list when nothing matches", async () => {
    const result = await mockRecipeService.listRecipes({ search: "없는재료" });
    expect(result).toEqual([]);
  });

  it("creates, reads, updates and deletes a recipe", async () => {
    const created = await mockRecipeService.createRecipe({
      ...blank,
      name: "감자 미음",
      ingredients: [{ name: "감자", amount: "1/2개" }],
      mealTimes: ["breakfast"],
    });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();

    const fetched = await mockRecipeService.getRecipe(created.id);
    expect(fetched?.name).toBe("감자 미음");

    const updated = await mockRecipeService.updateRecipe(created.id, {
      ...blank,
      name: "감자 당근 미음",
      ingredients: [{ name: "당근", amount: "20g" }],
      mealTimes: ["lunch_dinner"],
    });
    expect(updated.name).toBe("감자 당근 미음");
    expect(updated.createdAt).toBe(created.createdAt);

    const byIngredient = await mockRecipeService.listRecipes({
      search: "당근",
    });
    expect(byIngredient.map((r) => r.id)).toContain(created.id);

    await mockRecipeService.deleteRecipe(created.id);
    expect(await mockRecipeService.getRecipe(created.id)).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    expect(await mockRecipeService.getRecipe("nope")).toBeNull();
  });
});
