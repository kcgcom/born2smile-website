"use client";

import { SnsLinksEditor } from "./settings/SnsLinksEditor";
import { ClinicInfoEditor } from "./settings/ClinicInfoEditor";
import { HoursEditor } from "./settings/HoursEditor";
import { QuickLinksSection } from "./settings/QuickLinksSection";

export function SettingsTab() {
  return (
    <div className="grid gap-6">
      <SnsLinksEditor />
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <ClinicInfoEditor />
        <HoursEditor />
      </div>
      <QuickLinksSection />
    </div>
  );
}
