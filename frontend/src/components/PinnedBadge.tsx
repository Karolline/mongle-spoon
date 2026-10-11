import { Pin } from "lucide-react";

/** Marks a recipe pinned to the top of the list. */
export function PinnedBadge() {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-clay px-2 py-0.5 text-[11px] font-bold text-cream">
      <Pin className="size-3" fill="currentColor" aria-hidden />
      고정
    </span>
  );
}
