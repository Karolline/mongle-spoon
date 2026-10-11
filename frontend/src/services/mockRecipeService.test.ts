import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MOCK_PASSWORD,
  mockRecipeService,
  resetMockRecipes,
} from "./mockRecipeService";
import { isUnauthorized } from "./errors";
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
  beforeEach(async () => {
    resetMockRecipes();
    await mockRecipeService.unlock(MOCK_PASSWORD);
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

  describe("pinning", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("puts pinned recipes first, most recently pinned first", async () => {
      const before = (await mockRecipeService.listRecipes()).map((r) => r.id);
      const [oldest, secondOldest] = [before.at(-1)!, before.at(-2)!];
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-01T09:00:00Z"));
      await mockRecipeService.pinRecipe(secondOldest);
      vi.setSystemTime(new Date("2026-10-01T09:01:00Z"));
      await mockRecipeService.pinRecipe(oldest);

      const after = (await mockRecipeService.listRecipes()).map((r) => r.id);
      expect(after).toEqual([oldest, secondOldest, ...before.slice(0, -2)]);
    });

    it("applies search and meal time to pinned recipes too", async () => {
      await mockRecipeService.pinRecipe("seed-1"); // 소고기 애호박 미음: no snack
      await mockRecipeService.pinRecipe("seed-5"); // 두부 새송이 무름: snack
      const snacks = await mockRecipeService.listRecipes({ mealTime: "snack" });
      expect(snacks.map((r) => r.id)).not.toContain("seed-1");
      expect(snacks[0]!.id).toBe("seed-5");
    });

    it("keeps updatedAt, and the first pin time when pinned again", async () => {
      const original = (await mockRecipeService.getRecipe("seed-3"))!;
      expect(original.pinnedAt).toBeNull();
      const pinned = await mockRecipeService.pinRecipe("seed-3");
      expect(pinned.pinnedAt).not.toBeNull();
      expect(pinned.updatedAt).toBe(original.updatedAt);
      expect((await mockRecipeService.pinRecipe("seed-3")).pinnedAt).toBe(
        pinned.pinnedAt,
      );

      const unpinned = await mockRecipeService.unpinRecipe("seed-3");
      expect(unpinned).toEqual(original);
    });

    it("keeps the pin when a recipe is updated", async () => {
      const pinned = await mockRecipeService.pinRecipe("seed-3");
      const updated = await mockRecipeService.updateRecipe("seed-3", {
        ...blank,
        name: "닭안심 죽",
      });
      expect(updated.pinnedAt).toBe(pinned.pinnedAt);
    });

    it("needs the password", async () => {
      mockRecipeService.lock();
      await expect(mockRecipeService.pinRecipe("seed-1")).rejects.toSatisfy(
        isUnauthorized,
      );
      await expect(mockRecipeService.unpinRecipe("seed-1")).rejects.toSatisfy(
        isUnauthorized,
      );
    });
  });

  describe("last made", () => {
    it("puts recently made recipes next, most recent first, never made last", async () => {
      const before = (await mockRecipeService.listRecipes()).map((r) => r.id);
      const [oldest, secondOldest] = [before.at(-1)!, before.at(-2)!];
      await mockRecipeService.setLastMade(oldest, "2026-10-09");
      await mockRecipeService.setLastMade(secondOldest, "2026-10-11");

      const after = (await mockRecipeService.listRecipes()).map((r) => r.id);
      expect(after).toEqual([secondOldest, oldest, ...before.slice(0, -2)]);
    });

    it("puts pinned recipes before recently made ones", async () => {
      await mockRecipeService.setLastMade("seed-1", "2026-10-11");
      await mockRecipeService.pinRecipe("seed-5");
      const ids = (await mockRecipeService.listRecipes()).map((r) => r.id);
      expect(ids.slice(0, 2)).toEqual(["seed-5", "seed-1"]);
    });

    it("sorts recipes made on the same day by most recently updated", async () => {
      const before = (await mockRecipeService.listRecipes()).map((r) => r.id);
      for (const id of before) {
        await mockRecipeService.setLastMade(id, "2026-10-11");
      }
      const after = (await mockRecipeService.listRecipes()).map((r) => r.id);
      expect(after).toEqual(before);
    });

    it("keeps updatedAt, can be cleared, and survives an update", async () => {
      const original = (await mockRecipeService.getRecipe("seed-3"))!;
      expect(original.lastMadeOn).toBeNull();
      const made = await mockRecipeService.setLastMade("seed-3", "2026-10-11");
      expect(made).toEqual({ ...original, lastMadeOn: "2026-10-11" });

      const updated = await mockRecipeService.updateRecipe("seed-3", {
        ...blank,
        name: "닭안심 죽",
      });
      expect(updated.lastMadeOn).toBe("2026-10-11");

      const cleared = await mockRecipeService.clearLastMade("seed-3");
      expect(cleared.lastMadeOn).toBeNull();
    });

    it("rejects anything but a YYYY-MM-DD date", async () => {
      await expect(
        mockRecipeService.setLastMade("seed-1", "2026-10-11T09:00:00Z"),
      ).rejects.toMatchObject({ status: 422 });
    });

    it("needs the password", async () => {
      mockRecipeService.lock();
      await expect(
        mockRecipeService.setLastMade("seed-1", "2026-10-11"),
      ).rejects.toSatisfy(isUnauthorized);
      await expect(mockRecipeService.clearLastMade("seed-1")).rejects.toSatisfy(
        isUnauthorized,
      );
    });
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

  it("rejects writes until unlocked with the right password", async () => {
    mockRecipeService.lock();
    expect(mockRecipeService.isUnlocked()).toBe(false);
    const write = mockRecipeService.createRecipe({ ...blank, name: "x" });
    await expect(write).rejects.toSatisfy(isUnauthorized);
    await expect(mockRecipeService.deleteRecipe("seed-1")).rejects.toSatisfy(
      isUnauthorized,
    );

    expect(await mockRecipeService.unlock("wrong")).toBe(false);
    expect(mockRecipeService.isUnlocked()).toBe(false);
    expect(await mockRecipeService.unlock(MOCK_PASSWORD)).toBe(true);
    expect(mockRecipeService.isUnlocked()).toBe(true);
    await mockRecipeService.deleteRecipe("seed-1");
    expect(await mockRecipeService.getRecipe("seed-1")).toBeNull();
  });
});
