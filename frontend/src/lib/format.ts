import { DEFAULT_LEFTOVER_UNIT, LEFTOVER_MAX } from "@/services/types";

export function relativeKo(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const day = 86_400_000;
  if (diff < 60_000) return "방금 전";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < day) return `${Math.floor(diff / 3_600_000)}시간 전`;
  const days = Math.floor(diff / day);
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

/** Today's calendar date in the device's time zone, as `YYYY-MM-DD`. */
export function todayLocal(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function parseDay(day: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** `2026-10-11` → "2026년 10월 11일". */
export function dateKo(day: string): string {
  const p = parseDay(day);
  return p ? `${p.y}년 ${p.m}월 ${p.d}일` : "";
}

/**
 * How long ago a calendar day was, counted in whole days from `today`
 * (both `YYYY-MM-DD`): "오늘", "어제", "3일 전", "2주 전", then the date itself.
 */
export function daysAgoKo(day: string, today: string = todayLocal()): string {
  const p = parseDay(day);
  const t = parseDay(today);
  if (!p || !t) return "";
  // UTC midnight on both sides, so daylight saving can't shift the count.
  const days = Math.round(
    (Date.UTC(t.y, t.m - 1, t.d) - Date.UTC(p.y, p.m - 1, p.d)) / 86_400_000,
  );
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days > 1 && days < 7) return `${days}일 전`;
  if (days >= 7 && days < 30) return `${Math.floor(days / 7)}주 전`;
  return p.y === t.y ? `${p.m}월 ${p.d}일` : `${p.y}년 ${p.m}월 ${p.d}일`;
}

/** The unit shown for a leftover amount: the recipe's own, or "개" when empty. */
export function leftoverUnitKo(unit: string): string {
  return unit.trim() || DEFAULT_LEFTOVER_UNIT;
}

/**
 * A typed leftover amount: a whole number from 0 to `LEFTOVER_MAX`
 * (surrounding spaces allowed), otherwise null.
 */
export function parseLeftover(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return amount <= LEFTOVER_MAX ? amount : null;
}
