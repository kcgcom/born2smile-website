import type { ReactNode } from "react";

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      {children}
    </div>
  );
}
