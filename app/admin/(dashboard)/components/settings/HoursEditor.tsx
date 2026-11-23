"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { AdminActionButton } from "@/components/admin/AdminChrome";
import { FormField, SectionShell, LoadingPlaceholder } from "../shared";
import { AdminErrorState } from "../AdminErrorState";
import { useSettingsEditor } from "./useSettingsEditor";
import type { SiteHours } from "@/lib/site-config-supabase";

function formatExceptionDateLabel(date: string) {
  if (!date) return "날짜 미설정";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${year}.${month}.${day}`;
}

export function HoursEditor({ exceptionsOnly }: { exceptionsOnly: boolean }) {
  const { form, loading, loadError, refetch, saving, saved, dirty, recovery, saveError, handleSave, updateForm, setField } =
    useSettingsEditor<SiteHours>("/api/admin/site-config/hours", {
      patch: exceptionsOnly ? ({ exceptions }) => ({ exceptions }) : undefined,
    });
  const [exceptionEditor, setExceptionEditor] = useState<number | "list" | null>(null);
  const addExceptionButton = useRef<HTMLButtonElement>(null);
  const pendingDateFocus = useRef<number | null>(null);

  const setScheduleField = (
    index: number,
    key: "time" | "open" | "note",
    value: string | boolean,
  ) => {
    updateForm((prev) => ({
      ...prev,
      schedule: prev.schedule.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));
  };

  const setExceptionField = (
    index: number,
    key: "date" | "time" | "open" | "note",
    value: string | boolean,
  ) => {
    updateForm((prev) => ({
      ...prev,
      exceptions: (prev.exceptions ?? []).map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));
  };

  const addException = () => {
    if (!form) return;
    const index = form.exceptions.length;
    pendingDateFocus.current = index;
    setExceptionEditor(index);
    updateForm((prev) => ({
      ...prev,
      exceptions: [
        ...(prev.exceptions ?? []),
        { date: "", open: false, time: "휴진", note: "" },
      ],
    }));
  };

  const removeException = (index: number) => {
    updateForm((prev) => ({
      ...prev,
      exceptions: (prev.exceptions ?? []).filter((_, i) => i !== index),
    }));
    setExceptionEditor("list");
    addExceptionButton.current?.focus();
  };

  if (!form) {
    if (loading && !loadError) return <LoadingPlaceholder />;
    return <AdminErrorState message={`진료시간 조회 실패: ${loadError ?? "설정 데이터를 불러올 수 없습니다."}`} onRetry={refetch} />;
  }

  const exceptionActionsDisabled = !recovery.ready || recovery.hasConflict;
  const exceptionSection = (
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[var(--foreground)]">예외 일정</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            특정 날짜 휴진, 단축 진료, 추가 진료 같은 예외 운영을 등록합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminActionButton ref={addExceptionButton} tone="dark" onClick={addException} disabled={exceptionActionsDisabled} className="min-h-11 px-3 text-sm">
            <Plus className="h-3.5 w-3.5" />
            예외 일정 추가
          </AdminActionButton>
          {exceptionEditor !== null && (
            <AdminActionButton
              tone="ghost"
              disabled={saving}
              onClick={() => {
                if (dirty && !window.confirm("저장하지 않은 변경사항이 있습니다. 편집을 닫으시겠습니까?")) return;
                setExceptionEditor(null);
                addExceptionButton.current?.focus();
              }}
              className="min-h-11 px-3 text-sm"
            >
              예외 일정 편집 닫기
            </AdminActionButton>
          )}
        </div>
      </div>

      {form.exceptions.length === 0 ? (
        <div className="rounded-xl bg-[var(--background)]/72 px-4 py-3 text-sm text-[var(--muted)]">
          등록된 예외 일정이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {form.exceptions.map((exception, index) => (
            exceptionEditor !== index ? (
              <div key={index} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="min-w-0 break-words">
                  <span className="font-medium">{formatExceptionDateLabel(exception.date)}</span>
                  {" · "}{exception.time || (exception.open ? "운영시간 미설정" : "휴진")}
                  {exception.note ? ` · ${exception.note}` : null}
                </div>
                <AdminActionButton
                  tone="ghost"
                  aria-label={`${formatExceptionDateLabel(exception.date)} 예외 일정 편집`}
                  disabled={exceptionActionsDisabled}
                  onClick={() => {
                    pendingDateFocus.current = index;
                    setExceptionEditor(index);
                  }}
                  className="min-h-11 shrink-0 px-3"
                >
                  수정
                </AdminActionButton>
              </div>
            ) : (
              <fieldset
                key={index}
                disabled={recovery.hasConflict}
                aria-label={`예외 일정 ${index + 1} 편집`}
                className="grid min-w-0 gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/72 p-4 md:grid-cols-[160px_96px_minmax(0,1fr)_minmax(0,1fr)_84px] md:items-center"
              >
                <input
                  ref={(input) => {
                    if (input && pendingDateFocus.current === index) {
                      pendingDateFocus.current = null;
                      input.focus();
                    }
                  }}
                  type="date"
                  value={exception.date}
                  onChange={(e) => setExceptionField(index, "date", e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  aria-label={`예외 일정 ${index + 1} 날짜`}
                />
                <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={exception.open}
                    onChange={(e) => setExceptionField(index, "open", e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                  />
                  운영
                </label>
                <input
                  type="text"
                  value={exception.time}
                  onChange={(e) => setExceptionField(index, "time", e.target.value)}
                  placeholder={exception.open ? "10:00 - 15:00" : "휴진"}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  aria-label={`예외 일정 ${index + 1} 시간`}
                />
                <input
                  type="text"
                  value={exception.note ?? ""}
                  onChange={(e) => setExceptionField(index, "note", e.target.value)}
                  placeholder="예: 현충일 휴진"
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  aria-label={`예외 일정 ${index + 1} 비고`}
                />
                <AdminActionButton
                  tone="ghost"
                  onClick={() => removeException(index)}
                  className="px-3 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </AdminActionButton>
              </fieldset>
            )
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {loadError && <AdminErrorState message={`진료시간 조회 실패: ${loadError}`} onRetry={refetch} />}
      <SectionShell
        title="진료시간"
        canEdit={!exceptionsOnly}
        description="요일별 운영 여부와 공지 문구를 함께 관리합니다."
        preview={(
          <div className="space-y-2 rounded-xl bg-[var(--background)]/72 p-3">
            <div className="space-y-2">
              {form.schedule.map((row) => (
                <div key={row.day} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 text-[var(--foreground)]">
                    {row.day}
                    {row.note ? <span className="ml-1 text-xs text-[var(--muted)]">({row.note})</span> : null}
                  </div>
                  <div className={row.open ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>{row.time}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border)] pt-2 text-sm text-[var(--muted)]">
              점심시간 {form.lunchTime || "미설정"} · {form.closedDays || "휴진일 미설정"}
              {form.notice ? <span className="block pt-1">{form.notice}</span> : null}
            </div>
          </div>
        )}
        saving={saving}
        saved={saved}
        dirty={dirty}
        recovery={recovery}
        onSave={handleSave}
        saveError={saveError}
        additionalSection={exceptionSection}
        additionalEditing={exceptionEditor !== null}
      >
        <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
          <div className="hidden border-b border-[var(--border)]/50 px-4 py-2 md:grid md:grid-cols-[88px_92px_minmax(0,1fr)_minmax(0,1fr)]">
            <span className="text-xs font-medium text-[var(--muted)]">요일</span>
            <span className="text-xs font-medium text-[var(--muted)]">운영</span>
            <span className="text-xs font-medium text-[var(--muted)]">시간</span>
            <span className="text-xs font-medium text-[var(--muted)]">비고</span>
          </div>
          {form.schedule.map((row, i) => (
            <div
              key={row.day}
              className={`grid gap-3 px-4 py-4 md:grid-cols-[88px_92px_minmax(0,1fr)_minmax(0,1fr)] md:items-center ${
                i === 0 ? "" : "border-t border-[var(--border)]/50"
              } ${row.open ? "bg-[var(--background)]" : "bg-[var(--background)]/60"}`}
            >
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{row.day}</div>
                <div className="mt-1 text-xs text-[var(--muted)] md:hidden">
                  {row.open ? "운영 중" : "휴진"}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={row.open}
                  onChange={(e) => setScheduleField(i, "open", e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                />
                운영
              </label>

              <input
                type="text"
                value={row.time}
                onChange={(e) => setScheduleField(i, "time", e.target.value)}
                placeholder="09:30 - 18:30"
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
                aria-label={`${row.day} 진료 시간`}
              />

              <input
                type="text"
                value={row.note ?? ""}
                onChange={(e) => setScheduleField(i, "note", e.target.value)}
                placeholder="예: 야간진료"
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
                aria-label={`${row.day} 비고`}
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <FormField
            label="점심시간"
            value={form.lunchTime}
            onChange={setField("lunchTime")}
            placeholder="13:00 - 14:00"
          />
          <FormField
            label="휴진일"
            value={form.closedDays}
            onChange={setField("closedDays")}
            placeholder="일요일, 공휴일 휴진"
          />
          <FormField
            label="공지사항"
            value={form.notice}
            onChange={setField("notice")}
            placeholder="토요일 점심시간 없이 진료"
          />
        </div>
      </SectionShell>
    </div>
  );
}
