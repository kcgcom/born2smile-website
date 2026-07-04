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
  dirty = false,
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
  dirty?: boolean;
  onSave: () => void;
  saveError: string | null;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = () => {
    if (open && dirty && !window.confirm("저장하지 않은 변경사항이 있습니다. 편집을 닫으시겠습니까?")) {
      return;
    }
    setOpen((current) => !current);
  };

  return (
    <AdminSurface tone="white" className="rounded-2xl p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[var(--foreground)]">{title}</h3>
            <AdminPill tone={saved ? "sky" : dirty ? "amber" : "white"} className="text-[10px]">
              {saved ? "저장 완료" : dirty ? "수정됨" : "편집 가능"}
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
            onClick={handleToggle}
            className="px-3 text-xs"
          >
            {open ? <X className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}
            {open ? "편집 닫기" : "편집"}
          </AdminActionButton>
          {open && <SaveButton saving={saving} saved={saved} disabled={!dirty && !saving} onClick={onSave} />}
        </div>
      </div>
      {saveError && (
        <AdminNotice tone="error" className="mb-4">
          저장 실패: {saveError}
        </AdminNotice>
      )}
      <div className="rounded-xl bg-[var(--background)]/72 px-4 py-4">
        {preview}
      </div>
      {open ? <div className="mt-4">{children}</div> : null}
    </AdminSurface>
  );
}
