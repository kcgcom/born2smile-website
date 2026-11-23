"use client";

import { SnsLinksEditor } from "./settings/SnsLinksEditor";
import { ClinicInfoEditor } from "./settings/ClinicInfoEditor";
import { HoursEditor } from "./settings/HoursEditor";
import { QuickLinksSection } from "./settings/QuickLinksSection";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";

export function SettingsTab({ staffWorkspace }: { staffWorkspace: boolean }) {
  const { access } = useAdminAuthState();
  const canEditBasics = !staffWorkspace && access?.isOwner === true;

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:[&>div:has([data-settings-editing=true])]:col-span-2">
      <ClinicInfoEditor key={`clinic-${canEditBasics}`} readOnly={!canEditBasics} />
      <HoursEditor key={`hours-${canEditBasics}`} exceptionsOnly={!canEditBasics} />
      {canEditBasics && <SnsLinksEditor />}
      <QuickLinksSection />
    </div>
  );
}
