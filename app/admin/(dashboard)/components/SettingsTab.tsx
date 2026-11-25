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
  const clinicCard = <ClinicInfoEditor key={String(canEditBasics)} readOnly={!canEditBasics} />;

  return (
    <div className="space-y-6">
      <EmergencyNoticeEditor />
      <HoursEditor key={String(canEditBasics)} exceptionsOnly={!canEditBasics} clinicCard={clinicCard} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {canEditBasics && <SnsLinksEditor />}
        <QuickLinksSection />
      </div>
    </div>
  );
}
