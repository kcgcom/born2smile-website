"use client";

import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { SettingsTab } from "@/app/admin/(dashboard)/components/SettingsTab";

export function SettingsTabShell() {
  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">사이트 설정</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              병원 기본 정보, 진료시간, 외부 채널 링크를 한 곳에서 관리합니다. 추후 운영 예외/공지 기능도 이 영역에 확장할 수 있습니다.
            </p>
          </div>
          <AdminPill tone="white">확장 예정: 운영 예외</AdminPill>
        </div>
      </AdminSurface>
      <SettingsTab />
    </div>
  );
}
