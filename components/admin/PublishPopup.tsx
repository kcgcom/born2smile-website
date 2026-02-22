"use client";

import { Calendar, Check, X } from "lucide-react";

export type PublishMode = "immediate" | "schedule" | "custom";

interface PublishPopupProps {
  publishDate: string;
  publishMode: PublishMode;
  scheduledDate: string;
  publishing: boolean;
  today: string;
  onModeChange: (mode: PublishMode) => void;
  onDateChange: (date: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  error?: string | null;
}

export function PublishPopup({
  publishDate,
  publishMode,
  scheduledDate,
  publishing,
  today,
  onModeChange,
  onDateChange,
  onConfirm,
  onClose,
  error,
}: PublishPopupProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="발행"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-[var(--surface)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--foreground)]">발행</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <fieldset className="mb-4 space-y-2">
          <legend className="sr-only">발행 방식 선택</legend>

          {/* 스케줄에 맞춰 발행 (기본) */}
          <label className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
            publishMode === "schedule"
              ? "border-[var(--color-primary)] bg-blue-50"
              : "border-[var(--border)] hover:border-[var(--muted-light)]"
          }`}>
            <input
              type="radio"
              name="publishMode"
              value="schedule"
              checked={publishMode === "schedule"}
              onChange={() => {
                onModeChange("schedule");
                onDateChange(scheduledDate);
              }}
              className="accent-[var(--color-primary)]"
            />
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">스케줄에 맞춰 발행</span>
              <p className="text-xs text-[var(--muted)]">
                {scheduledDate ? `추천 날짜: ${scheduledDate}` : "날짜 계산 중..."}
              </p>
            </div>
          </label>

          {/* 즉시 발행 */}
          <label className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
            publishMode === "immediate"
              ? "border-green-500 bg-green-50"
              : "border-[var(--border)] hover:border-[var(--muted-light)]"
          }`}>
            <input
              type="radio"
              name="publishMode"
              value="immediate"
              checked={publishMode === "immediate"}
              onChange={() => {
                onModeChange("immediate");
                onDateChange(today);
              }}
              className="accent-green-600"
            />
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">즉시 발행</span>
              <p className="text-xs text-[var(--muted)]">오늘 ({today}) 바로 공개됩니다</p>
            </div>
          </label>

          {/* 날짜 직접 선택 */}
          <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
            publishMode === "custom"
              ? "border-[var(--color-gold)] bg-amber-50"
              : "border-[var(--border)] hover:border-[var(--muted-light)]"
          }`}>
            <input
              type="radio"
              name="publishMode"
              value="custom"
              checked={publishMode === "custom"}
              onChange={() => onModeChange("custom")}
              className="mt-0.5 accent-[var(--color-gold)]"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-[var(--foreground)]">날짜 직접 선택</span>
              {publishMode === "custom" && (
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/15"
                />
              )}
            </div>
          </label>
        </fieldset>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={publishing}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={publishing || !publishDate}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors ${
              publishMode === "immediate"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
            }`}
          >
            {publishMode === "immediate" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            {publishing
              ? "처리 중..."
              : publishMode === "immediate"
              ? "즉시 발행"
              : "발행 예약"}
          </button>
        </div>
      </div>
    </div>
  );
}
