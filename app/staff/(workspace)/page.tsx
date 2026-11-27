import { ClinicInfoEditor } from "@/app/admin/(dashboard)/components/settings/ClinicInfoEditor";
import { HoursEditor } from "@/app/admin/(dashboard)/components/settings/HoursEditor";
import { EmergencyNoticeEditor } from "@/app/admin/(dashboard)/components/settings/EmergencyNoticeEditor";
import { HoursSummaryCard } from "@/app/admin/(dashboard)/components/settings/HoursSummaryCard";
import { QuickLinksSection } from "@/app/admin/(dashboard)/components/settings/QuickLinksSection";

export default function StaffHome() {
  return (
    <div className="space-y-6">
      <EmergencyNoticeEditor />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <ClinicInfoEditor readOnly />
          <HoursSummaryCard />
        </div>
        <div id="staff-hours" className="min-w-0 scroll-mt-4">
          <HoursEditor exceptionsOnly />
        </div>
      </div>
      <QuickLinksSection />
    </div>
  );
}
