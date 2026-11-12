"use client";

import { AdminActionButton } from "./AdminChrome";
import { AdminNotice } from "./AdminNotice";

export interface DraftRecoveryState {
  hasConflict: boolean;
  canRestore: boolean;
  recoveryNotice: string | null;
  restoreConflict: () => void;
  discardConflict: () => void;
}

export function DraftRecoveryNotice({ recovery }: { recovery: DraftRecoveryState }) {
  if (recovery.hasConflict) {
    return (
      <AdminNotice tone="warning">
        <p>{recovery.canRestore
          ? "저장된 내용이 변경되어 이전 입력을 자동 복구하지 않았습니다. 보관된 입력을 복구하거나 삭제한 뒤 편집해 주세요."
          : "보관된 이전 입력을 읽을 수 없습니다. 원본은 보존되어 있습니다. 삭제한 뒤 편집을 계속할 수 있습니다."}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {recovery.canRestore && <AdminActionButton type="button" tone="dark" onClick={recovery.restoreConflict}>이전 입력 복구</AdminActionButton>}
          <AdminActionButton type="button" tone="dark" onClick={recovery.discardConflict}>이전 입력 삭제</AdminActionButton>
        </div>
      </AdminNotice>
    );
  }
  return recovery.recoveryNotice ? <AdminNotice tone="info">{recovery.recoveryNotice}</AdminNotice> : null;
}
