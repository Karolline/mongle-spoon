import { useEffect, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import {
  MEAL_TIMES,
  MEAL_TIME_LABELS,
  recipeService,
  type Ingredient,
  type MealTime,
} from "@/services";
import { AppBackground } from "./AppBackground";

interface Props {
  recipeId?: string;
  onSaved: (id: string) => void;
  onCancel: () => void;
}

const EMPTY_ROW: Ingredient = { name: "", amount: "" };

export function RecipeFormScreen({ recipeId, onSaved, onCancel }: Props) {
  const isEdit = Boolean(recipeId);
  const [ready, setReady] = useState(!isEdit);
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { ...EMPTY_ROW },
  ]);
  const [instructions, setInstructions] = useState("");
  const [servings, setServings] = useState("");
  const [mealTimes, setMealTimes] = useState<MealTime[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recipeId) return;
    let alive = true;
    void recipeService.getRecipe(recipeId).then((r) => {
      if (!alive || !r) return;
      setName(r.name);
      setIngredients(
        r.ingredients.length ? r.ingredients.map((i) => ({ ...i })) : [
          { ...EMPTY_ROW },
        ],
      );
      setInstructions(r.instructions);
      setServings(r.servings);
      setMealTimes([...r.mealTimes]);
      setNotes(r.notes);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [recipeId]);

  function updateIngredient(index: number, patch: Partial<Ingredient>) {
    setIngredients((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function toggleMealTime(mt: MealTime) {
    setMealTimes((prev) =>
      prev.includes(mt) ? prev.filter((m) => m !== mt) : [...prev, mt],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("메뉴 이름을 입력해 주세요.");
      return;
    }
    setError(null);
    setSaving(true);
    const payload = {
      name: name.trim(),
      ingredients: ingredients
        .map((i) => ({ name: i.name.trim(), amount: i.amount.trim() }))
        .filter((i) => i.name || i.amount),
      instructions: instructions.trim(),
      servings: servings.trim(),
      mealTimes,
      notes: notes.trim(),
    };
    try {
      const saved = recipeId
        ? await recipeService.updateRecipe(recipeId, payload)
        : await recipeService.createRecipe(payload);
      onSaved(saved.id);
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <AppBackground>{null}</AppBackground>;

  return (
    <AppBackground>
      <button
        type="button"
        onClick={onCancel}
        className="rise mb-4 flex items-center gap-1 text-[13px] font-medium text-ink-soft"
      >
        <ChevronLeft className="size-4" />
        취소
      </button>

      <h1 className="rise mb-5 text-[26px] font-black leading-none tracking-tight">
        {isEdit ? "레시피 수정" : "새 레시피"}
      </h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="메뉴 이름" delay="rise-1">
          <input
            aria-label="메뉴 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예) 소고기 애호박 미음"
            className="w-full rounded-2xl bg-cream/70 px-4 py-3.5 text-[15px] outline-none placeholder:text-ink-faint"
          />
          {error ? (
            <p role="alert" className="mt-2 text-[13px] font-medium text-clay">
              {error}
            </p>
          ) : null}
        </Field>

        <Field label="재료" delay="rise-2">
          <div className="space-y-2">
            {ingredients.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  aria-label={`재료 이름 ${i + 1}`}
                  value={row.name}
                  onChange={(e) => updateIngredient(i, { name: e.target.value })}
                  placeholder="재료"
                  className="min-w-0 flex-1 rounded-2xl bg-cream/70 px-4 py-3 text-[15px] outline-none placeholder:text-ink-faint"
                />
                <input
                  aria-label={`재료 양 ${i + 1}`}
                  value={row.amount}
                  onChange={(e) =>
                    updateIngredient(i, { amount: e.target.value })
                  }
                  placeholder="30g"
                  className="w-24 shrink-0 rounded-2xl bg-cream/70 px-3 py-3 text-[15px] outline-none placeholder:text-ink-faint"
                />
                <button
                  type="button"
                  aria-label={`재료 삭제 ${i + 1}`}
                  onClick={() =>
                    setIngredients((prev) =>
                      prev.length === 1
                        ? [{ ...EMPTY_ROW }]
                        : prev.filter((_, idx) => idx !== i),
                    )
                  }
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-ink/10 bg-white/60 text-ink-soft"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIngredients((prev) => [...prev, { ...EMPTY_ROW }])}
            className="mt-3 w-full rounded-2xl border border-dashed border-ink/20 py-3 text-[14px] font-medium text-ink-soft"
          >
            + 재료 추가
          </button>
        </Field>

        <Field label="끼니" delay="rise-3">
          <div className="flex flex-wrap gap-2">
            {MEAL_TIMES.map((mt) => (
              <label
                key={mt}
                className={
                  mealTimes.includes(mt)
                    ? "flex cursor-pointer items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-cream"
                    : "flex cursor-pointer items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-4 py-2.5 text-[14px] font-medium text-ink-soft"
                }
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={mealTimes.includes(mt)}
                  onChange={() => toggleMealTime(mt)}
                />
                {MEAL_TIME_LABELS[mt]}
              </label>
            ))}
          </div>
        </Field>

        <Field label="분량" delay="rise-3">
          <input
            aria-label="분량"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            placeholder="예) 3~4회분"
            className="w-full rounded-2xl bg-cream/70 px-4 py-3.5 text-[15px] outline-none placeholder:text-ink-faint"
          />
        </Field>

        <Field label="만드는 법" delay="rise-4">
          <textarea
            aria-label="만드는 법"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            placeholder="조리 순서를 자유롭게 적어 주세요."
            className="w-full resize-none rounded-2xl bg-cream/70 px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-ink-faint"
          />
        </Field>

        <Field label="메모" delay="rise-4">
          <textarea
            aria-label="메모"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="아기 반응, 보관 팁 등 자유 메모"
            className="w-full resize-none rounded-2xl bg-cream/70 px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-ink-faint"
          />
        </Field>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-ink/15 bg-white/70 px-6 py-3.5 text-[15px] font-medium text-ink-soft"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-2xl bg-clay py-3.5 text-[15px] font-bold text-cream disabled:opacity-60"
          >
            저장
          </button>
        </div>
      </form>
    </AppBackground>
  );
}

function Field({
  label,
  delay,
  children,
}: {
  label: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rise ${delay} rounded-3xl border border-white/60 bg-white/60 p-5 shadow-[0_14px_34px_-18px_rgba(180,86,46,0.4)] backdrop-blur-xl`}
    >
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </h2>
      {children}
    </section>
  );
}
