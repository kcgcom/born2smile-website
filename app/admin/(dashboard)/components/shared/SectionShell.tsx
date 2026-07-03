"use client";

import { useState, type ReactNode } from "react";
import { PencilLine, X } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { SaveButton } from "./SaveButton";

export function SectionShell({
  title,
  description,
  summary,
  preview,
  saving,
  saved,
  onSave,
  saveError,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  summary?: string;
  preview: ReactNode;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  saveError: string | null;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <AdminSurface tone="white" className="rounded-2xl p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[var(--foreground)]">{title}</h3>
            <AdminPill tone={saved ? "sky" : "white"} className="text-[10px]">
              {saved ? "저장 완료" : "편집 가능"}
            </AdminPill>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          {summary && (
            <p className="mt-2 text-xs text-[var(--muted)]">{summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AdminActionButton
            tone="dark"
            onClick={() => setOpen((current) => !current)}
            className="px-3 text-xs"
          >
            {open ? <X className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}
            {open ? "편집 닫기" : "편집"}
          </AdminActionButton>
          {open && <SaveButton saving={saving} saved={saved} onClick={onSave} />}
        </div>
      </div>
      <div className="rounded-xl bg-[var(--background)]/72 px-4 py-4">
        {preview}
      </div>
      {saveError && (
        <AdminNotice tone="error" className="mb-4">
          저장 실패: {saveError}
        </AdminNotice>
      )}
      {open ? <div className="mt-4">{children}</div> : null}
    </AdminSurface>
  );
}
