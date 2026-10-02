import { useState } from "react";
import { recipeService } from "@/services";

interface Props {
  onUnlocked: () => void;
  onCancel: () => void;
}

export function PasswordDialog({ onUnlocked, onCancel }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("비밀번호를 입력해 주세요.");
      return;
    }
    setChecking(true);
    try {
      if (await recipeService.unlock(password)) {
        onUnlocked();
        return;
      }
      setError("비밀번호가 맞지 않아요.");
    } catch {
      setError("확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 px-5 pb-8 backdrop-blur-sm">
      <form
        role="dialog"
        aria-label="비밀번호 입력"
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-md rounded-3xl border border-white/60 bg-cream p-6 shadow-[0_20px_50px_-20px_rgba(44,33,24,0.6)]"
      >
        <p className="text-[17px] font-bold">비밀번호를 입력해 주세요</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          레시피를 추가, 수정, 삭제하려면 비밀번호가 필요해요. 이 기기에서는
          한 번만 입력하면 돼요.
        </p>
        <input
          type="password"
          aria-label="비밀번호"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-2xl bg-white/70 px-4 py-3.5 text-[15px] outline-none"
        />
        {error ? (
          <p role="alert" className="mt-2 text-[13px] font-medium text-clay">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-ink/15 bg-white/70 py-3.5 text-[15px] font-medium text-ink-soft"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={checking}
            className="flex-1 rounded-2xl bg-ink py-3.5 text-[15px] font-bold text-cream disabled:opacity-60"
          >
            확인
          </button>
        </div>
      </form>
    </div>
  );
}
