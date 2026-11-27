"use client";

import { SnsLinksEditor } from "./settings/SnsLinksEditor";
import { ClinicInfoEditor } from "./settings/ClinicInfoEditor";
import { HoursEditor } from "./settings/HoursEditor";
import { EmergencyNoticeEditor } from "./settings/EmergencyNoticeEditor";
import { QuickLinksSection } from "./settings/QuickLinksSection";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";

export function SettingsTab({ staffWorkspace }: { staffWorkspace: boolean }) {
  const { access } = useAdminAuthState();
  const canEditBasics = !staffWorkspace && access?.isOwner === true;
  const clinicCard = <ClinicInfoEditor readOnly={!canEditBasics} />;

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[auto_1fr]">
        <EmergencyNoticeEditor />
        <HoursEditor key={String(canEditBasics)} exceptionsOnly={!canEditBasics} clinicCard={clinicCard} />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {canEditBasics && <SnsLinksEditor />}
        <QuickLinksSection />
      </div>
    </div>
  );
}
