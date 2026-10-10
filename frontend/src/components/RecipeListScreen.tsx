import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  MEAL_TIMES,
  MEAL_TIME_LABELS,
  recipeService,
  type MealTime,
  type Recipe,
} from "@/services";
import { AppBackground } from "./AppBackground";
import { useUnlockGate } from "./useUnlockGate";
import { relativeKo } from "@/lib/format";

/**
 * Waits before each automatic retry when loading fails, e.g. while a free
 * host or database wakes up (about 30 seconds in total).
 */
const DEFAULT_RETRY_DELAYS_MS = [3000, 9000, 18000];

type LoadStatus = "loading" | "retrying" | "error" | "ready";

interface Props {
  onOpenRecipe: (id: string) => void;
  onAdd: () => void;
  /** Overridable so tests don't have to wait. Pass a stable array. */
  retryDelaysMs?: number[];
}

export function RecipeListScreen({
  onOpenRecipe,
  onAdd,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
}: Props) {
  const [search, setSearch] = useState("");
  const [mealTime, setMealTime] = useState<MealTime | null>(null);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const { unlocked, requireUnlock, lock, dialog } = useUnlockGate();

  useEffect(() => {
    // Ignore responses from a load that a newer search or filter replaced.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const attempt = async (retry: number) => {
      try {
        const result = await recipeService.listRecipes({ search, mealTime });
        if (cancelled) return;
        setRecipes(result);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        const delay = retryDelaysMs[retry];
        if (delay === undefined) {
          setStatus("error");
          return;
        }
        setStatus("retrying");
        timer = setTimeout(() => void attempt(retry + 1), delay);
      }
    };

    void attempt(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, mealTime, retryDelaysMs, reloadKey]);

  const retry = () => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  };

  const isFiltering = search.trim().length > 0 || mealTime !== null;
  // Previous results stay on screen while a new search or filter loads.
  const shown = status === "error" ? null : recipes;

  return (
    <AppBackground>
      <header className="rise flex items-end justify-between pb-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            내 레시피
          </p>
          <h1 className="mt-1 truncate text-[28px] font-black leading-none tracking-tight">
            몽글스푼
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {unlocked ? (
            <button
              type="button"
              onClick={lock}
              className="rounded-full border border-ink/10 bg-white/60 px-3 py-1 text-[12px] font-medium text-ink-soft"
            >
              잠금
            </button>
          ) : null}
          {shown !== null ? (
            <span
              data-testid="recipe-count"
              className="font-mono text-[11px] tabular-nums text-ink-soft"
            >
              {shown.length}
              <span className="text-ink-faint">개</span>
            </span>
          ) : null}
        </div>
      </header>

      <div className="rise rise-1 sticky top-3 z-20 rounded-3xl border border-white/60 bg-white/55 p-3 shadow-[0_10px_30px_-14px_rgba(180,86,46,0.35)] backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-2xl bg-cream/70 px-3.5 py-3">
          <Search className="size-4 shrink-0 text-ink-faint" />
          <input
            aria-label="이름 또는 재료 검색"
            placeholder="이름 또는 재료 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          <FilterChip
            label="전체"
            active={mealTime === null}
            onClick={() => setMealTime(null)}
          />
          {MEAL_TIMES.map((mt) => (
            <FilterChip
              key={mt}
              label={MEAL_TIME_LABELS[mt]}
              active={mealTime === mt}
              // Tapping the active chip again clears the filter, like 전체.
              onClick={() => setMealTime(mealTime === mt ? null : mt)}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {status === "error" ? (
          <div
            role="alert"
            className="rise rise-2 rounded-3xl border border-dashed border-ink/15 bg-cream-deep/40 p-8 text-center"
          >
            <p className="text-[16px] font-bold">서버에 연결 중이에요</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              잠시 후 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-cream"
            >
              다시 시도
            </button>
          </div>
        ) : shown === null ? (
          <div
            role="status"
            className="rise rise-2 rounded-3xl border border-dashed border-ink/15 bg-cream-deep/40 p-8 text-center"
          >
            <p className="text-[16px] font-bold">레시피를 불러오는 중이에요…</p>
            {status === "retrying" ? (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                서버가 깨어나는 중일 수 있어요. 조금만 기다려 주세요.
              </p>
            ) : null}
          </div>
        ) : shown.length === 0 ? (
          <div className="rise rise-2 rounded-3xl border border-dashed border-ink/15 bg-cream-deep/40 p-8 text-center">
            {isFiltering ? (
              <>
                <p className="text-[16px] font-bold">찾는 레시피가 없어요</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                  다른 이름이나 재료로 검색해 보시거나, 끼니 필터를 바꿔보세요.
                </p>
              </>
            ) : (
              <>
                <p className="text-[16px] font-bold">
                  아직 저장된 레시피가 없어요
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                  오늘 만든 아기 밥상을 첫 레시피로 기록해 보세요.
                </p>
              </>
            )}
          </div>
        ) : (
          shown.map((recipe, i) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              delayClass={
                ["rise-1", "rise-2", "rise-3", "rise-4"][Math.min(i, 3)]!
              }
              onClick={() => onOpenRecipe(recipe.id)}
            />
          ))
        )}
      </div>

      <p
        data-testid="app-version"
        className="mt-10 text-center font-mono text-[10px] tracking-[0.16em] text-ink-faint"
      >
        v{__APP_VERSION__}
      </p>

      <button
        onClick={() => requireUnlock(onAdd)}
        className="fixed bottom-6 right-5 z-30 flex items-center gap-2 rounded-full bg-clay px-5 py-4 text-[15px] font-bold text-cream shadow-[0_14px_30px_-8px_rgba(180,86,46,0.6)] transition-colors duration-200 hover:bg-clay-soft"
      >
        <span className="font-mono text-lg leading-none">+</span>
        추가
      </button>

      {dialog}
    </AppBackground>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? "shrink-0 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-cream"
          : "shrink-0 rounded-full border border-ink/10 bg-white/60 px-4 py-2 text-[13px] font-medium text-ink-soft"
      }
    >
      {label}
    </button>
  );
}

function RecipeCard({
  recipe,
  delayClass,
  onClick,
}: {
  recipe: Recipe;
  delayClass: string;
  onClick: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={`rise ${delayClass} cursor-pointer rounded-3xl border border-white/60 bg-white/60 p-5 shadow-[0_14px_34px_-18px_rgba(180,86,46,0.4)] backdrop-blur-xl`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          {relativeKo(recipe.updatedAt)} 수정
        </span>
        {recipe.servings ? (
          <span className="shrink-0 rounded-full bg-clay/12 px-2.5 py-1 font-mono text-[11px] font-medium text-clay">
            {recipe.servings}
          </span>
        ) : null}
      </div>
      <h2 className="mt-2.5 text-[20px] font-bold leading-snug tracking-tight">
        {recipe.name}
      </h2>
      {recipe.mealTimes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.mealTimes.map((mt) => (
            <span
              key={mt}
              className="rounded-full bg-porridge/20 px-2.5 py-1 text-[12px] font-medium text-ink-soft"
            >
              {MEAL_TIME_LABELS[mt]}
            </span>
          ))}
        </div>
      ) : null}
      {recipe.ingredients.length > 0 ? (
        <p className="mt-3 truncate text-[13px] text-ink-soft">
          {recipe.ingredients
            .map((i) => [i.name, i.amount].filter(Boolean).join(" "))
            .join(" · ")}
        </p>
      ) : null}
    </article>
  );
}
