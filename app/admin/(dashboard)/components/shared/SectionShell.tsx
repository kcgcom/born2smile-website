"use client";

import { useState, type ReactNode } from "react";
import { PencilLine, X } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { DraftRecoveryNotice, type DraftRecoveryState } from "@/components/admin/DraftRecoveryNotice";
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
  recovery,
  onSave,
  saveError,
  defaultOpen = false,
  mobileSaveBar = false,
  children,
}: {
  title: string;
  description: string;
  summary?: string;
  preview: ReactNode;
  saving: boolean;
  saved: boolean;
  dirty?: boolean;
  recovery?: DraftRecoveryState;
  onSave: () => void;
  saveError: string | null;
  defaultOpen?: boolean;
  mobileSaveBar?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const saveButton = <SaveButton saving={saving} saved={saved} disabled={recovery?.hasConflict || (!dirty && !saving)} onClick={onSave} />;

  const handleToggle = () => {
    if (open && dirty && !window.confirm("저장하지 않은 변경사항이 있습니다. 편집을 닫으시겠습니까?")) {
      return;
    }
    setOpen((current) => !current);
  };

  return (
    <AdminSurface tone="white" data-settings-editing={open} className="rounded-2xl p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap gap-3 sm:flex-nowrap sm:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[var(--foreground)]">{title}</h3>
            {(dirty || saved) && (
              <AdminPill tone={dirty ? "warning" : "success"} className={mobileSaveBar && open ? "text-xs max-sm:hidden" : "text-xs"}>
                {dirty ? "수정됨" : "저장 완료"}
              </AdminPill>
            )}
          </div>
          {open && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
          {summary && (
            <p className="mt-2 text-xs text-[var(--muted)]">{summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AdminActionButton
            tone="dark"
            onClick={handleToggle}
            aria-expanded={open}
            className="min-h-11 px-3 text-sm"
          >
            {open ? <X className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}
            {open ? "편집 닫기" : "편집"}
          </AdminActionButton>
          {open && (mobileSaveBar ? <div className="hidden sm:block">{saveButton}</div> : saveButton)}
        </div>
      </div>
      {recovery && (recovery.hasConflict || recovery.recoveryNotice) && <div className="mb-4"><DraftRecoveryNotice recovery={recovery} /></div>}
      {saveError && (
        <AdminNotice tone="error" className={mobileSaveBar && open ? "mb-4 hidden sm:flex" : "mb-4"}>
          저장 실패: {saveError}
        </AdminNotice>
      )}
      <details className="rounded-xl bg-[var(--background)]/72 px-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm">현재 설정 보기</summary>
        <div className="pb-4">{preview}</div>
      </details>
      {open ? <fieldset disabled={recovery?.hasConflict} className="mt-4 min-w-0">{children}</fieldset> : null}
      {open && mobileSaveBar && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex items-center justify-between gap-2 rounded-b-2xl border-t border-slate-200 bg-white px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(15,23,42,0.06)] sm:hidden">
          <p role="status" className={`min-w-0 break-words text-xs ${saveError ? "text-red-700" : saved ? "text-emerald-700" : "text-slate-600"}`}>
            {saving ? "저장 중…" : saveError ? `저장 실패: ${saveError}` : saved ? "저장 완료" : dirty ? "저장하지 않은 변경사항이 있습니다." : ""}
          </p>
          <div className="shrink-0">{saveButton}</div>
        </div>
      )}
    </AdminSurface>
  );
}
