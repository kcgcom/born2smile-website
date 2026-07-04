"use client";

import { SnsLinksEditor } from "./settings/SnsLinksEditor";
import { ClinicInfoEditor } from "./settings/ClinicInfoEditor";
import { HoursEditor } from "./settings/HoursEditor";
import { QuickLinksSection } from "./settings/QuickLinksSection";

export function SettingsTab() {
  return (
    <div className="grid gap-6">
      <ClinicInfoEditor />
      <HoursEditor />
      <SnsLinksEditor />
      <QuickLinksSection />
    </div>
  );
}
