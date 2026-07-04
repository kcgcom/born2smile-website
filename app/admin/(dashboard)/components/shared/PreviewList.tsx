"use client";

import type { ReactNode } from "react";

export function PreviewList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 border-b border-[var(--border)]/80 pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:gap-3"
        >
          <div className="w-28 shrink-0 text-xs font-medium text-[var(--muted)]">{item.label}</div>
          <div className="min-w-0 text-sm text-[var(--foreground)] break-all">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
