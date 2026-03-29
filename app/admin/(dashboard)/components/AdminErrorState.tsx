"use client";

import { AlertCircle } from "lucide-react";
import { AdminActionButton, AdminSurface } from "@/components/admin/AdminChrome";

interface AdminErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function AdminErrorState({ message, onRetry }: AdminErrorStateProps) {
  return (
    <AdminSurface
      tone="white"
      className="flex flex-col items-center gap-3 rounded-2xl border-red-100 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] px-6 py-10 text-center"
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <AdminActionButton
          onClick={onRetry}
          tone="primary"
          className="mt-1 px-4"
        >
          다시 시도
        </AdminActionButton>
      )}
    </AdminSurface>
  );
}
