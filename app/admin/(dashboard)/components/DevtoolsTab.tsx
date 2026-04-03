"use client";

import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { DevTab } from "@/app/admin/(dashboard)/components/DevTab";

export function DevtoolsShell() {
  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">개발도구</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              기존 개발 탭을 별도 후순위 영역으로 옮겨 운영 화면과 분리했습니다.
            </p>
          </div>
          <AdminPill tone="warning">개발자 전용 성격</AdminPill>
        </div>
      </AdminSurface>
      <DevTab />
    </div>
  );
}
