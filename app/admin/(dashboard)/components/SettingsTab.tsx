"use client";

import { ArrowDown } from "lucide-react";
import { SnsLinksEditor } from "./settings/SnsLinksEditor";
import { ClinicInfoEditor } from "./settings/ClinicInfoEditor";
import { HoursEditor } from "./settings/HoursEditor";
import { HoursSummaryCard } from "./settings/HoursSummaryCard";
import { EmergencyNoticeEditor } from "./settings/EmergencyNoticeEditor";
import { QuickLinksSection } from "./settings/QuickLinksSection";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";

const STAFF_HOURS_ID = "staff-hours";

export function SettingsTab({ staffWorkspace }: { staffWorkspace: boolean }) {
  const { access } = useAdminAuthState();
  const canEditBasics = !staffWorkspace && access?.isOwner === true;
  const clinicDetails = (
    <>
      <ClinicInfoEditor readOnly={!canEditBasics} />
      {staffWorkspace && <HoursSummaryCard />}
    </>
  );

  return (
    <div className="space-y-6">
      {staffWorkspace && (
        <a
          href={`#${STAFF_HOURS_ID}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          예외 일정 바로가기
          <ArrowDown aria-hidden="true" className="size-4" />
        </a>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[auto_1fr]">
        <EmergencyNoticeEditor />
        <HoursEditor
          key={String(canEditBasics)}
          exceptionsOnly={!canEditBasics}
          clinicDetails={clinicDetails}
          exceptionSectionId={staffWorkspace ? STAFF_HOURS_ID : undefined}
        />
      </div>
      <div className={staffWorkspace ? undefined : "grid items-start gap-6 lg:grid-cols-2"}>
        {canEditBasics && <SnsLinksEditor />}
        <QuickLinksSection />
      </div>
    </div>
  );
}
