import type { ReactNode } from "react";

export function AppBackground({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-cream font-sans text-ink antialiased">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-gradient-to-b from-clay/15 via-clay/5 to-transparent" />
      <div className="pointer-events-none fixed bottom-0 left-0 h-72 w-72 rounded-full bg-porridge/25 blur-3xl" />
      <div className="pointer-events-none fixed right-0 top-1/3 h-56 w-56 rounded-full bg-clay-soft/20 blur-3xl" />
      <div className="relative mx-auto max-w-md px-5 pb-28 pt-6">{children}</div>
    </div>
  );
}
