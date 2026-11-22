"use client";

import type { ReactNode } from "react";
import { captureEvent } from "@/lib/posthog";

export function TrackedFaq({ id, surface, children }: {
  id: string;
  surface: "faq" | "treatment";
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
      onToggle={event => {
        if (event.currentTarget.open) {
          captureEvent("faq_opened", { faq_id: id, surface }, { ga4: false });
        }
      }}
    >
      {children}
    </details>
  );
}
