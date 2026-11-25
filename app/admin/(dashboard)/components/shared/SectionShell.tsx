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
  pendingSaveMessage,
  recovery,
  onSave,
  saveBlocked = false,
  saveError,
  defaultOpen = false,
  canEdit = true,
  additionalSection,
  additionalEditing = false,
  children,
}: {
  title: string;
  description: string;
  summary?: string;
  preview: ReactNode;
  saving: boolean;
  saved: boolean;
  dirty?: boolean;
  pendingSaveMessage?: string;
  recovery?: DraftRecoveryState;
  onSave: () => void;
  saveBlocked?: boolean;
  saveError: string | null;
  defaultOpen?: boolean;
  canEdit?: boolean;
  additionalSection?: ReactNode;
  additionalEditing?: boolean;
  children: ReactNode;
}) {
  const [editorOpen, setOpen] = useState(defaultOpen);
  const open = canEdit && editorOpen;
  const editing = open || additionalEditing;
  const showPendingMessage = dirty && Boolean(pendingSaveMessage);
  const saveButton = <SaveButton saving={saving} saved={saved} disabled={saveBlocked || recovery?.hasConflict || (!dirty && !saving)} onClick={onSave} />;

  const handleToggle = () => {
    if (open && dirty && !window.confirm("저장하지 않은 변경사항이 있습니다. 편집을 닫으시겠습니까?")) {
      return;
    }
    setOpen((current) => !current);
  };

  return (
    <AdminSurface tone="white" data-settings-editing={editing} className="rounded-2xl p-4 sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-lg font-bold text-[var(--foreground)]">{title}</h3>
            {(dirty || saved) && (
              <AdminPill tone={dirty ? "warning" : "success"} className={editing ? "text-xs max-sm:hidden" : "text-xs"}>
                {dirty ? "수정됨" : "저장 완료"}
              </AdminPill>
            )}
          </div>
          {open && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
          {summary && (
            <p className="mt-2 text-xs text-[var(--muted)]">{summary}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {open && <div className="hidden sm:block">{saveButton}</div>}
          {canEdit && <AdminActionButton
            tone="dark"
            onClick={handleToggle}
            aria-expanded={open}
            className={open
              ? "min-h-11 px-3 text-sm"
              : "size-11 p-0! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"}
          >
            {open ? <X aria-hidden="true" className="size-3.5" /> : <PencilLine aria-hidden="true" className="size-4" />}
            <span className={open ? undefined : "sr-only"}>{open ? "편집 닫기" : "편집"}</span>
          </AdminActionButton>}
        </div>
      </div>
      {recovery && (recovery.hasConflict || recovery.recoveryNotice) && <div className="mb-4"><DraftRecoveryNotice recovery={recovery} /></div>}
      {saveError && (
        <AdminNotice tone="error" className={editing ? "mb-4 hidden sm:flex" : "mb-4"}>
          저장 실패: {saveError}
        </AdminNotice>
      )}
      {!open && preview}
      {open ? <fieldset disabled={recovery?.hasConflict} className="mt-4 min-w-0">{children}</fieldset> : null}
      {additionalSection}
      {editing && (
        <div className={`sticky bottom-0 z-20 -mx-4 mt-4 flex items-center justify-between gap-2 rounded-b-2xl border-t border-slate-200 bg-white px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(15,23,42,0.06)] sm:static sm:mx-0 sm:justify-end sm:rounded-none sm:px-0 sm:shadow-none ${open ? "sm:hidden" : ""}`}>
          <p role="status" className={`min-w-0 break-words text-xs ${showPendingMessage ? "" : "sm:hidden"} ${saveError ? "text-red-700" : saved ? "text-emerald-700" : "text-slate-600"}`}>
            {saving ? "저장 중…" : saveError ? `저장 실패: ${saveError}` : saved ? "저장 완료" : dirty ? (pendingSaveMessage ?? "저장하지 않은 변경사항이 있습니다.") : ""}
          </p>
          <div className="shrink-0">{saveButton}</div>
        </div>
      )}
    </AdminSurface>
  );
}
