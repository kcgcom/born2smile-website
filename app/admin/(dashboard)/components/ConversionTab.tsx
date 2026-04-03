"use client";

import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { ConversionSubTab } from "@/app/admin/(dashboard)/components/insight/ConversionSubTab";

export function ConversionReportTab() {
  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">전환 중심 리포트</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              전화·상담 CTA 성과를 별도 탭으로 분리해 일상 운영 흐름에서 바로 확인할 수 있게 했습니다.
            </p>
          </div>
          <AdminPill tone="white">전화 상담 중심</AdminPill>
        </div>
      </AdminSurface>
      <ConversionSubTab />
    </div>
  );
}
