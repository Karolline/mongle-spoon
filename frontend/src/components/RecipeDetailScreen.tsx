import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { MEAL_TIME_LABELS, recipeService, type Recipe } from "@/services";
import { AppBackground } from "./AppBackground";
import { relativeKo } from "@/lib/format";

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

  async function handleDelete() {
    await recipeService.deleteRecipe(recipeId);
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
          <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            {relativeKo(recipe.updatedAt)} 수정
          </span>
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
          onClick={onEdit}
          className="flex-1 rounded-2xl bg-ink py-3.5 text-[15px] font-semibold text-cream"
        >
          수정
        </button>
        <button
          onClick={() => setConfirming(true)}
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
    </AppBackground>
  );
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
