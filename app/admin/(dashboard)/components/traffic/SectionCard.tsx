import type { ReactNode } from "react";

export function SectionCard({ title, children, empty = false }: { title: string; children: ReactNode; empty?: boolean }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      {empty ? <p className="text-sm text-slate-600">선택 기간의 데이터가 없습니다.</p> : children}
    </div>
  );
}
