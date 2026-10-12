import { useEffect, useState } from "react";
import { Calendar, CalendarCheck, ChevronLeft, Minus, Pin, Plus } from "lucide-react";
import {
  LEFTOVER_MAX,
  MEAL_TIME_LABELS,
  isUnauthorized,
  recipeService,
  type Recipe,
} from "@/services";
import { AppBackground } from "./AppBackground";
import { useUnlockGate } from "./useUnlockGate";
import {
  dateKo,
  daysAgoKo,
  leftoverUnitKo,
  parseLeftover,
  relativeKo,
  todayLocal,
} from "@/lib/format";
import { PinnedBadge } from "./PinnedBadge";

interface Props {
  recipeId: string;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function RecipeDetailScreen({
  recipeId,
  onBack,
  onEdit,
  onDeleted,
}: Props) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { requireUnlock, dialog } = useUnlockGate();
  const askToDelete = () => requireUnlock(() => setConfirming(true));
  const togglePin = (pinned: boolean) =>
    requireUnlock(() => void savePin(pinned));
  /** Records the day (`YYYY-MM-DD`) the recipe was made; null clears it. */
  const recordMade = (day: string | null) =>
    requireUnlock(() => void saveLastMade(day));
  // True while a leftover change is being saved: −/+ wait for it, so quick
  // taps can't send amounts out of order (each sends the new amount).
  const [leftoverSaving, setLeftoverSaving] = useState(false);
  // The typed amount while [숫자 입력] is open; null shows the −/+ row.
  const [leftoverDraft, setLeftoverDraft] = useState<string | null>(null);
  /** Records how much is left (the new amount); null clears it. */
  const changeLeftover = (amount: number | null, onSaved?: () => void) =>
    requireUnlock(() => void saveLeftover(amount, onSaved));

  useEffect(() => {
    let alive = true;
    void recipeService.getRecipe(recipeId).then((r) => {
      if (!alive) return;
      setRecipe(r);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [recipeId]);

  async function savePin(pinned: boolean) {
    let updated: Recipe;
    try {
      updated = pinned
        ? await recipeService.unpinRecipe(recipeId)
        : await recipeService.pinRecipe(recipeId);
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
      // The remembered password is no longer valid: ask for it again.
      togglePin(pinned);
      return;
    }
    setRecipe(updated);
  }

  async function saveLastMade(day: string | null) {
    let updated: Recipe;
    try {
      updated =
        day === null
          ? await recipeService.clearLastMade(recipeId)
          : await recipeService.setLastMade(recipeId, day);
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
      // The remembered password is no longer valid: ask for it again.
      recordMade(day);
      return;
    }
    setRecipe(updated);
  }

  async function saveLeftover(amount: number | null, onSaved?: () => void) {
    setLeftoverSaving(true);
    let updated: Recipe;
    try {
      updated =
        amount === null
          ? await recipeService.clearLeftover(recipeId)
          : await recipeService.setLeftover(recipeId, amount);
    } catch (error) {
      setLeftoverSaving(false);
      if (!isUnauthorized(error)) throw error;
      // The remembered password is no longer valid: ask for it again.
      changeLeftover(amount, onSaved);
      return;
    }
    setLeftoverSaving(false);
    setRecipe(updated);
    onSaved?.();
  }

  async function handleDelete() {
    try {
      await recipeService.deleteRecipe(recipeId);
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
      // The remembered password is no longer valid: ask for it again.
      setConfirming(false);
      askToDelete();
      return;
    }
    onDeleted();
  }

  if (!loaded) return <AppBackground>{null}</AppBackground>;

  if (!recipe) {
    return (
      <AppBackground>
        <div className="rise rounded-3xl border border-dashed border-ink/15 bg-cream-deep/40 p-8 text-center">
          <p className="text-[16px] font-bold">레시피를 찾을 수 없어요</p>
          <button
            onClick={onBack}
            className="mt-4 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-cream"
          >
            목록으로
          </button>
        </div>
      </AppBackground>
    );
  }

  const pinned = recipe.pinnedAt !== null;
  const today = todayLocal();
  const leftover = recipe.leftover;
  const leftoverUnit = leftoverUnitKo(recipe.leftoverUnit);
  const typedLeftover =
    leftoverDraft === null ? null : parseLeftover(leftoverDraft);

  return (
    <AppBackground>
      <button
        onClick={onBack}
        className="rise mb-4 flex items-center gap-1 text-[13px] font-medium text-ink-soft"
      >
        <ChevronLeft className="size-4" />
        목록으로
      </button>

      <div className="rise rise-1 rounded-3xl border border-white/60 bg-white/60 p-5 shadow-[0_14px_34px_-18px_rgba(180,86,46,0.4)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {pinned ? <PinnedBadge /> : null}
            <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {relativeKo(recipe.updatedAt)} 수정
            </span>
          </div>
          {recipe.servings ? (
            <span className="shrink-0 rounded-full bg-clay/12 px-2.5 py-1 font-mono text-[11px] font-medium text-clay">
              {recipe.servings}
            </span>
          ) : null}
        </div>
        <h1 className="mt-2.5 text-[24px] font-black leading-snug tracking-tight">
          {recipe.name}
        </h1>
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
      </div>

      <Section title="마지막으로 만든 날" delay="rise-2">
        <p data-testid="last-made" className="text-[15px] font-semibold">
          {recipe.lastMadeOn ? (
            <>
              {dateKo(recipe.lastMadeOn)}{" "}
              <span className="font-normal text-ink-soft">
                ({daysAgoKo(recipe.lastMadeOn, today)})
              </span>
            </>
          ) : (
            <span className="font-normal text-ink-soft">
              아직 기록이 없어요
            </span>
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => recordMade(today)}
            className="flex items-center gap-1.5 rounded-full bg-clay px-4 py-2.5 text-[13px] font-bold text-cream"
          >
            <CalendarCheck className="size-4" aria-hidden />
            오늘 만들었어요
          </button>
          {/* Looks like a button; the real date input covers it, invisible.
              It stays 16px so iPhone Safari doesn't zoom when it's tapped. */}
          <label className="relative flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/70 px-4 py-2.5 text-[13px] font-medium text-ink-soft ring-clay/40 has-[:focus-visible]:ring-2">
            <Calendar className="size-4" aria-hidden />
            다른 날
            <input
              type="date"
              aria-label="만든 날 고르기"
              max={today}
              value={recipe.lastMadeOn ?? ""}
              onClick={(e) => openDatePicker(e.currentTarget)}
              onChange={(e) => {
                const day = e.target.value;
                // Ignore clearing the picker and days in the future.
                if (day && day <= today) recordMade(day);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none text-[16px] opacity-0"
            />
          </label>
          {recipe.lastMadeOn ? (
            <button
              type="button"
              onClick={() => recordMade(null)}
              className="px-2 py-2.5 text-[12px] font-medium text-ink-faint underline underline-offset-2"
            >
              기록 지우기
            </button>
          ) : null}
        </div>
      </Section>

      <Section title="남은 양" delay="rise-2">
        {leftoverDraft === null ? (
          <>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="하나 줄이기"
                disabled={leftoverSaving || leftover === null || leftover <= 0}
                onClick={() => {
                  if (leftover !== null) changeLeftover(leftover - 1);
                }}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-ink/15 bg-white/70 text-ink-soft disabled:opacity-40"
              >
                <Minus className="size-5" aria-hidden />
              </button>
              <p
                data-testid="leftover"
                className="min-w-0 flex-1 truncate text-center"
              >
                {leftover === null ? (
                  <span className="text-[15px] text-ink-soft">
                    아직 기록이 없어요
                  </span>
                ) : leftover === 0 ? (
                  <span className="text-[17px] font-bold">다 먹었어요</span>
                ) : (
                  <>
                    <span className="text-[22px] font-black tabular-nums">
                      {leftover}
                    </span>
                    <span className="text-[15px] font-semibold text-ink-soft">
                      {leftoverUnit}
                    </span>
                  </>
                )}
              </p>
              <button
                type="button"
                aria-label="하나 늘리기"
                disabled={leftoverSaving || (leftover ?? 0) >= LEFTOVER_MAX}
                onClick={() =>
                  changeLeftover(leftover === null ? 1 : leftover + 1)
                }
                className="grid size-11 shrink-0 place-items-center rounded-full bg-clay text-cream disabled:opacity-40"
              >
                <Plus className="size-5" aria-hidden />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setLeftoverDraft(leftover === null ? "" : String(leftover))
                }
                className="rounded-full border border-ink/15 bg-white/70 px-4 py-2 text-[13px] font-medium text-ink-soft"
              >
                숫자 입력
              </button>
              {leftover !== null ? (
                <button
                  type="button"
                  aria-label="남은 양 기록 지우기"
                  disabled={leftoverSaving}
                  onClick={() => changeLeftover(null)}
                  className="px-2 py-2.5 text-[12px] font-medium text-ink-faint underline underline-offset-2"
                >
                  기록 지우기
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typedLeftover === null || leftoverSaving) return;
              changeLeftover(typedLeftover, () => setLeftoverDraft(null));
            }}
          >
            <div className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-cream/70 px-4 py-3 ring-clay/40 focus-within:ring-2">
                <input
                  inputMode="numeric"
                  aria-label="남은 양 입력"
                  value={leftoverDraft}
                  onChange={(e) => setLeftoverDraft(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[16px] tabular-nums outline-none"
                />
                <span className="max-w-[40%] shrink-0 truncate text-[14px] text-ink-soft">
                  {leftoverUnit}
                </span>
              </label>
              <button
                type="submit"
                disabled={typedLeftover === null || leftoverSaving}
                className="shrink-0 rounded-2xl bg-ink px-4 py-3 text-[14px] font-semibold text-cream disabled:opacity-40"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => setLeftoverDraft(null)}
                className="shrink-0 px-2 py-3 text-[13px] font-medium text-ink-soft"
              >
                취소
              </button>
            </div>
            <p className="mt-2 text-[12px] text-ink-faint">
              0부터 {LEFTOVER_MAX}까지 정수만 넣을 수 있어요.
            </p>
          </form>
        )}
      </Section>

      {recipe.ingredients.length > 0 ? (
        <Section title="재료" delay="rise-2">
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 text-[14px]"
              >
                <span className="min-w-0 truncate">{ing.name}</span>
                <span className="shrink-0 font-mono text-[13px] text-ink-soft">
                  {ing.amount}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {recipe.instructions ? (
        <Section title="만드는 법" delay="rise-3">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">
            {recipe.instructions}
          </p>
        </Section>
      ) : null}

      {recipe.notes ? (
        <Section title="메모" delay="rise-4">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">
            {recipe.notes}
          </p>
        </Section>
      ) : null}

      <div className="rise rise-4 mt-5 flex gap-2">
        <button
          onClick={() => togglePin(pinned)}
          className={`flex shrink-0 items-center gap-1.5 rounded-2xl border px-4 py-3.5 text-[15px] font-medium ${
            pinned
              ? "border-clay/30 bg-clay/10 text-clay"
              : "border-ink/15 bg-white/70 text-ink-soft"
          }`}
        >
          <Pin
            className="size-4"
            fill={pinned ? "currentColor" : "none"}
            aria-hidden
          />
          {pinned ? "고정 해제" : "고정"}
        </button>
        <button
          onClick={() => requireUnlock(onEdit)}
          className="flex-1 rounded-2xl bg-ink py-3.5 text-[15px] font-semibold text-cream"
        >
          수정
        </button>
        <button
          onClick={askToDelete}
          className="rounded-2xl border border-ink/15 bg-white/70 px-6 py-3.5 text-[15px] font-medium text-ink-soft"
        >
          삭제
        </button>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 px-5 pb-8 backdrop-blur-sm">
          <div
            role="dialog"
            aria-label="삭제 확인"
            className="w-full max-w-md rounded-3xl border border-white/60 bg-cream p-6 shadow-[0_20px_50px_-20px_rgba(44,33,24,0.6)]"
          >
            <p className="text-[17px] font-bold">이 레시피를 삭제할까요?</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              삭제하면 되돌릴 수 없어요.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-2xl border border-ink/15 bg-white/70 py-3.5 text-[15px] font-medium text-ink-soft"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-2xl bg-clay py-3.5 text-[15px] font-bold text-cream"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog}
    </AppBackground>
  );
}

/**
 * Opens the native date picker. Phones open it on tap anyway; desktop Chrome
 * only opens it from the small calendar icon, which is hidden here.
 */
function openDatePicker(input: HTMLInputElement) {
  try {
    input.showPicker?.();
  } catch {
    // Not allowed here (e.g. not a user gesture); the input still works.
  }
}

function Section({
  title,
  delay,
  children,
}: {
  title: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rise ${delay} mt-4 rounded-3xl border border-white/60 bg-white/60 p-5 shadow-[0_14px_34px_-18px_rgba(180,86,46,0.4)] backdrop-blur-xl`}
    >
      <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
