"use client";

import { SettingsTab } from "@/app/admin/(dashboard)/components/SettingsTab";

export function SettingsTabShell({ staffWorkspace = false }: { staffWorkspace?: boolean }) {
  return (
    <>
      <h1 className="sr-only">병원 설정</h1>
      <SettingsTab staffWorkspace={staffWorkspace} />
    </>
  );
}
