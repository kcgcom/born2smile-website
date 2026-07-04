"use client";

import { Save, Loader2, Check } from "lucide-react";
import { AdminActionButton } from "@/components/admin/AdminChrome";

export function SaveButton({
  saving,
  saved,
  disabled,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <AdminActionButton
      onClick={onClick}
      disabled={saving || disabled}
      tone="primary"
      className="px-4"
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : saved ? (
        <Check className="h-4 w-4" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
    </AdminActionButton>
  );
}
