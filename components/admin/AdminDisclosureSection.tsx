"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";

export function AdminDisclosureSection({
  title,
  description,
  countLabel,
  defaultOpen = false,
  collapsedMessage = "필요할 때만 상세 내용을 펼쳐 볼 수 있습니다.",
  titleLevel = "h3",
  headerRight,
  children,
}: {
  title: string;
  description: string;
  countLabel?: string;
  defaultOpen?: boolean;
  collapsedMessage?: string;
  titleLevel?: "h2" | "h3";
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const TitleTag = titleLevel;
  const id = useId();

  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <TitleTag id={`${id}-title`} className="text-sm font-semibold text-[var(--foreground)]">{title}</TitleTag>
          <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          {countLabel && <AdminPill tone="white">{countLabel}</AdminPill>}
          <AdminActionButton
            type="button"
            tone="dark"
            aria-expanded={open}
            aria-controls={`${id}-content`}
            onClick={() => setOpen((current) => !current)}
            className="min-h-11 px-3 py-2 text-sm"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {open ? "접기" : "상세 보기"}
          </AdminActionButton>
        </div>
      </div>
      <div id={`${id}-content`} hidden={!open}>{open ? children : null}</div>
      {!open && (
        <AdminSurface tone="white" className="rounded-2xl px-4 py-4 text-sm text-[var(--muted)]">
          {collapsedMessage}
        </AdminSurface>
      )}
    </section>
  );
}
