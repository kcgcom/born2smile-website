import { ArrowDown } from "lucide-react";
import { ClinicInfoEditor } from "@/app/admin/(dashboard)/components/settings/ClinicInfoEditor";
import { HoursEditor } from "@/app/admin/(dashboard)/components/settings/HoursEditor";
import { EmergencyNoticeEditor } from "@/app/admin/(dashboard)/components/settings/EmergencyNoticeEditor";
import { HoursSummaryCard } from "@/app/admin/(dashboard)/components/settings/HoursSummaryCard";
import { QuickLinksSection } from "@/app/admin/(dashboard)/components/settings/QuickLinksSection";

export default function StaffHome() {
  return (
    <div className="space-y-6">
      <a
        href="#staff-hours"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        예외 일정 바로가기
        <ArrowDown aria-hidden="true" className="size-4" />
      </a>
      <EmergencyNoticeEditor />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <ClinicInfoEditor readOnly />
          <HoursSummaryCard />
        </div>
        <section
          id="staff-hours"
          aria-label="예외 일정 관리"
          tabIndex={-1}
          className="min-w-0 scroll-mt-4 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <HoursEditor exceptionsOnly />
        </section>
      </div>
      <QuickLinksSection />
    </div>
  );
}
