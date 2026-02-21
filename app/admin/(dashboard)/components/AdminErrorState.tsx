"use client";

import { AlertCircle } from "lucide-react";

interface AdminErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function AdminErrorState({ message, onRetry }: AdminErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-6 py-10 text-center">
      <AlertCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
