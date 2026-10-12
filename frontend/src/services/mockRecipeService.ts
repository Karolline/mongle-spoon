import type {
  ListRecipesParams,
  Recipe,
  RecipeInput,
  RecipeService,
} from "./types";
import { ApiError } from "./errors";

/**
 * In-memory mock implementation of the recipe service.
 * A real FastAPI-backed implementation can replace this later without
 * touching any UI component: search + filtering + sorting live here.
 * Writes need `unlock(MOCK_PASSWORD)` first, like the real backend.
 */

export const MOCK_PASSWORD = "1234";

let store: Recipe[] = [];
let counter = 0;
let unlocked = false;

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function seed(): Recipe[] {
  const base: Array<Omit<Recipe, "id" | "pinnedAt" | "lastMadeOn">> = [
    {
      name: "소고기 애호박 미음",
      ingredients: [
        { name: "쌀가루", amount: "20g" },
        { name: "소고기", amount: "15g" },
        { name: "애호박", amount: "10g" },
        { name: "물", amount: "200ml" },
      ],
      instructions:
        "소고기를 핏물을 뺀 뒤 잘게 다지고, 애호박은 껍질과 씨를 제거해 곱게 다집니다.\n냄비에 물과 쌀가루를 넣고 약불에서 저어가며 끓이다가 재료를 넣고 5분 더 끓입니다.",
      servings: "3~4회분",
      mealTimes: ["breakfast", "lunch_dinner"],
      notes: "체에 한 번 걸러주면 훨씬 부드러워요.",
      createdAt: iso(20),
      updatedAt: iso(1),
    },
    {
      name: "단호박 고구마 매시",
      ingredients: [
        { name: "단호박", amount: "1/4개" },
        { name: "고구마", amount: "1/2개" },
        { name: "분유물", amount: "2큰술" },
      ],
      instructions:
        "단호박과 고구마를 쪄서 껍질을 벗기고, 분유물을 조금씩 넣어가며 곱게 으깹니다.",
      servings: "2회분",
      mealTimes: ["snack"],
      notes: "",
      createdAt: iso(18),
      updatedAt: iso(3),
    },
    {
      name: "닭안심 브로콜리 죽",
      ingredients: [
        { name: "불린 쌀", amount: "30g" },
        { name: "닭안심", amount: "20g" },
        { name: "브로콜리", amount: "10g" },
        { name: "물", amount: "250ml" },
      ],
      instructions:
        "닭안심은 삶아 결대로 찢어 다지고, 브로콜리는 꽃 부분만 데쳐 다집니다.\n불린 쌀과 물을 넣고 끓이다가 재료를 넣어 걸쭉해질 때까지 저어줍니다.",
      servings: "3회분",
      mealTimes: ["lunch_dinner"],
      notes: "브로콜리는 줄기를 빼고 사용해요.",
      createdAt: iso(15),
      updatedAt: iso(6),
    },
    {
      name: "바나나 오트밀 죽",
      ingredients: [
        { name: "오트밀", amount: "2큰술" },
        { name: "바나나", amount: "1/2개" },
        { name: "물", amount: "100ml" },
      ],
      instructions:
        "오트밀을 물에 넣고 약불에서 3분 끓인 뒤, 으깬 바나나를 넣고 한소끔 더 끓입니다.",
      servings: "1~2회분",
      mealTimes: ["breakfast", "snack"],
      notes: "",
      createdAt: iso(12),
      updatedAt: iso(9),
    },
    {
      name: "두부 새송이 무름",
      ingredients: [
        { name: "두부", amount: "40g" },
        { name: "새송이버섯", amount: "10g" },
        { name: "다시물", amount: "100ml" },
      ],
      instructions:
        "두부는 끓는 물에 살짝 데쳐 으깨고, 새송이버섯은 곱게 다져 다시물에 푹 끓입니다.",
      servings: "2~3회분",
      mealTimes: ["lunch_dinner", "snack"],
      notes: "간은 하지 않아요.",
      createdAt: iso(10),
      updatedAt: iso(14),
    },
  ];

  return base.map((r) => ({
    ...r,
    id: `seed-${++counter}`,
    pinnedAt: null,
    lastMadeOn: null,
  }));
}

/** Restores the seed recipes and locks writes again. */
export function resetMockRecipes(): void {
  counter = 0;
  store = seed();
  unlocked = false;
}

function requireUnlocked(): void {
  if (!unlocked) throw new ApiError(401, "Wrong or missing password");
}

resetMockRecipes();

function clone(recipe: Recipe): Recipe {
  return {
    ...recipe,
    mealTimes: [...recipe.mealTimes],
    ingredients: recipe.ingredients.map((i) => ({ ...i })),
  };
}

function matchesSearch(recipe: Recipe, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  if (recipe.name.toLowerCase().includes(q)) return true;
  return recipe.ingredients.some((i) => i.name.toLowerCase().includes(q));
}

function time(iso: string | null): number {
  return iso === null ? 0 : new Date(iso).getTime();
}

/** Null last, otherwise the later one first. */
function laterFirst(
  a: string | null,
  b: string | null,
  value: (s: string) => number,
): number {
  if (a === null || b === null) return Number(a === null) - Number(b === null);
  return value(b) - value(a);
}

/**
 * The later of the last update and the day last made, where a day counts as
 * its midnight UTC (so on the same day the update is more recent).
 */
function recency(recipe: Recipe): number {
  const updated = time(recipe.updatedAt);
  if (recipe.lastMadeOn === null) return updated;
  return Math.max(updated, time(`${recipe.lastMadeOn}T00:00:00Z`));
}

/**
 * Pinned first (most recently pinned first), then most recent of made or
 * updated, then most recently updated, then by id (like the backend).
 */
function byPinThenRecency(a: Recipe, b: Recipe): number {
  return (
    laterFirst(a.pinnedAt, b.pinnedAt, time) ||
    recency(b) - recency(a) ||
    time(b.updatedAt) - time(a.updatedAt) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/** Applies `change` to a stored recipe, keeping `updatedAt`. Needs unlocking. */
function patch(
  id: string,
  change: (existing: Recipe) => Partial<Recipe>,
): Recipe {
  requireUnlocked();
  const index = store.findIndex((r) => r.id === id);
  const existing = store[index];
  if (!existing) throw new ApiError(404, `Recipe not found: ${id}`);
  store[index] = { ...existing, ...change(existing) };
  return clone(store[index]);
}

function delay<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

export const mockRecipeService: RecipeService = {
  async listRecipes(params: ListRecipesParams = {}) {
    const { search = "", mealTime = null } = params;
    const result = store
      .filter((r) => matchesSearch(r, search))
      .filter((r) => (mealTime ? r.mealTimes.includes(mealTime) : true))
      .sort(byPinThenRecency)
      .map(clone);
    return delay(result);
  },

  async getRecipe(id: string) {
    const found = store.find((r) => r.id === id);
    return delay(found ? clone(found) : null);
  },

  async createRecipe(input: RecipeInput) {
    requireUnlocked();
    const now = new Date().toISOString();
    const recipe: Recipe = {
      ...input,
      ingredients: input.ingredients.map((i) => ({ ...i })),
      mealTimes: [...input.mealTimes],
      id: `recipe-${++counter}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
      pinnedAt: null,
      lastMadeOn: null,
    };
    store = [recipe, ...store];
    return delay(clone(recipe));
  },

  async updateRecipe(id: string, input: RecipeInput) {
    requireUnlocked();
    const index = store.findIndex((r) => r.id === id);
    const existing = store[index];
    if (!existing) throw new Error(`Recipe not found: ${id}`);
    const updated: Recipe = {
      ...existing,
      ...input,
      ingredients: input.ingredients.map((i) => ({ ...i })),
      mealTimes: [...input.mealTimes],
      updatedAt: new Date().toISOString(),
    };
    store[index] = updated;
    return delay(clone(updated));
  },

  async deleteRecipe(id: string) {
    requireUnlocked();
    store = store.filter((r) => r.id !== id);
    return delay(undefined);
  },

  async pinRecipe(id: string) {
    return delay(
      patch(id, (r) => ({ pinnedAt: r.pinnedAt ?? new Date().toISOString() })),
    );
  },

  async unpinRecipe(id: string) {
    return delay(patch(id, () => ({ pinnedAt: null })));
  },

  async setLastMade(id: string, day: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new ApiError(422, `Not a YYYY-MM-DD date: ${day}`);
    }
    return delay(patch(id, () => ({ lastMadeOn: day })));
  },

  async clearLastMade(id: string) {
    return delay(patch(id, () => ({ lastMadeOn: null })));
  },

  isUnlocked() {
    return unlocked;
  },

  async unlock(password: string) {
    const correct = password === MOCK_PASSWORD;
    if (correct) unlocked = true;
    return delay(correct);
  },

  lock() {
    unlocked = false;
  },
};
