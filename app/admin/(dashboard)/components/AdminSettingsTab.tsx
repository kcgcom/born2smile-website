"use client";

import { AdminSurface } from "@/components/admin/AdminChrome";
import { SettingsTab } from "@/app/admin/(dashboard)/components/SettingsTab";

export function SettingsTabShell({ staffWorkspace = false }: { staffWorkspace?: boolean }) {
  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-2xl px-4 py-3">
        <h2 className="text-lg font-bold text-[var(--foreground)]">병원 정보·진료시간</h2>
      </AdminSurface>
      <SettingsTab staffWorkspace={staffWorkspace} />
    </div>
  );
}
