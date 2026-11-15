import type { ReactNode } from "react";

export function ReportToolbar({ children }: { children: ReactNode }) {
  return (
    <section aria-label="리포트 조회 도구" className="space-y-4 lg:flex lg:flex-wrap lg:items-center lg:gap-3 lg:space-y-0 lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:p-3 lg:[&>div]:mb-0">
      {children}
    </section>
  );
}
