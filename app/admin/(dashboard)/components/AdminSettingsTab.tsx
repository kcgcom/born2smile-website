"use client";

import { AdminSurface } from "@/components/admin/AdminChrome";
import { SettingsTab } from "@/app/admin/(dashboard)/components/SettingsTab";

export function SettingsTabShell() {
  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-2xl px-4 py-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">사이트 설정</h2>

        </div>
      </AdminSurface>
      <SettingsTab />
    </div>
  );
}
