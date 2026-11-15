"use client";

import { SnsLinksEditor } from "./settings/SnsLinksEditor";
import { ClinicInfoEditor } from "./settings/ClinicInfoEditor";
import { HoursEditor } from "./settings/HoursEditor";
import { QuickLinksSection } from "./settings/QuickLinksSection";

export function SettingsTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:[&>div:has([data-settings-editing=true])]:col-span-2">
      <ClinicInfoEditor />
      <HoursEditor />
      <SnsLinksEditor />
      <QuickLinksSection />
    </div>
  );
}
