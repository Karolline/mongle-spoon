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
