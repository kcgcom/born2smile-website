"use client";

import { AdminSurface } from "@/components/admin/AdminChrome";
import { SettingsTab } from "@/app/admin/(dashboard)/components/SettingsTab";

export function SettingsTabShell() {
  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">사이트 설정</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            병원 기본 정보, 진료시간, 외부 채널 링크를 한 곳에서 관리합니다.
          </p>
        </div>
      </AdminSurface>
      <SettingsTab />
    </div>
  );
}
