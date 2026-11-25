"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { AdminActionButton } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { FormField, SectionShell, LoadingPlaceholder } from "../shared";
import { AdminErrorState } from "../AdminErrorState";
import { useSettingsEditor } from "./useSettingsEditor";
import { HoursExceptionCalendar } from "./HoursExceptionCalendar";
import { HoursScheduleSummary } from "./HoursSummaryCard";
import { getIntervals } from "@/lib/clinic-hours";
import type { SiteHours } from "@/lib/site-config-supabase";

const EXCEPTION_DESCRIPTION = "특정 날짜 휴진, 단축 진료, 추가 진료 같은 예외 운영을 등록합니다";
const SETTINGS_COLUMNS = "grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]";

function formatExceptionDateLabel(date: string) {
  if (!date) return "날짜 미설정";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${year}.${month}.${day}`;
}

export function HoursEditor({ exceptionsOnly, clinicCard }: { exceptionsOnly: boolean; clinicCard?: ReactNode }) {
  const { form, data, loading, loadError, refetch, saving, saved, dirty, recovery, saveError, fallbackSyncFailed, handleSave, discardChanges, updateForm, setField } =
    useSettingsEditor<SiteHours>("/api/admin/site-config/hours", {
      patch: exceptionsOnly ? ({ exceptions }) => ({ exceptions }) : undefined,
      persistDraft: !exceptionsOnly,
    });
  const [exceptionEditor, setExceptionEditor] = useState<number | "list" | null>(null);
  const [calendarNotice, setCalendarNotice] = useState<string | null>(null);
  const addExceptionButton = useRef<HTMLButtonElement>(null);
  const calendarRegion = useRef<HTMLDivElement>(null);
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

  const openExceptionEditor = (index: number) => {
    pendingDateFocus.current = index;
    setExceptionEditor(index);
  };

  const addException = () => {
    if (!form) return;
    openExceptionEditor(form.exceptions.length);
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
    (addExceptionButton.current ?? calendarRegion.current)?.focus();
  };

  if (!form) {
    const status = loading && !loadError
      ? <LoadingPlaceholder />
      : <AdminErrorState message={`진료시간 조회 실패: ${loadError ?? "설정 데이터를 불러올 수 없습니다."}`} onRetry={refetch} />;
    return clinicCard ? <div className={SETTINGS_COLUMNS}>{clinicCard}{status}</div> : status;
  }

  const exceptionActionsDisabled = !recovery.ready || recovery.hasConflict;
  const closeExceptionEditor = () => {
    setExceptionEditor(null);
    (addExceptionButton.current ?? calendarRegion.current)?.focus();
  };
  const selectCalendarDate = (date: string, regularlyClosed: boolean, weekday: string) => {
    setCalendarNotice(null);
    const index = form.exceptions.findIndex((entry) => entry.date === date);
    const current = form.exceptions[index];
    if (current?.open && !regularlyClosed) {
      openExceptionEditor(index);
      return;
    }

    const savedExceptions = data?.exceptions ?? [];
    const savedIndex = savedExceptions.findIndex((entry) => entry.date === date);
    const savedException = savedExceptions[savedIndex];
    const removing = current?.open === regularlyClosed;
    const restore = savedException && (removing ? savedException.open !== regularlyClosed : savedException.open === regularlyClosed)
      ? savedException : undefined;
    let replacement = restore;
    if (!removing && !restore) {
      const regularTime = form.schedule.find((row) => row.day === weekday)?.time ?? "";
      const firstOpenTime = form.schedule.find((row) => row.open && getIntervals(row.time, "", "").length)?.time;
      const time = regularlyClosed ? (getIntervals(regularTime, "", "").length ? regularTime : firstOpenTime) : "휴진";
      if (!time) {
        setCalendarNotice("정상진료 예외를 등록하려면 기본 진료시간을 먼저 설정해 주세요.");
        return;
      }
      replacement = { date, open: regularlyClosed, time, note: "" };
    }

    updateForm((prev) => {
      const exceptions = [...prev.exceptions];
      if (index !== -1) {
        exceptions.splice(index, 1, ...(replacement ? [replacement] : []));
      } else if (replacement) {
        const laterDates = new Set(savedExceptions.slice(savedIndex + 1).map((entry) => entry.date));
        const next = restore ? exceptions.findIndex((entry) => laterDates.has(entry.date)) : -1;
        exceptions.splice(next === -1 ? exceptions.length : next, 0, replacement);
      }
      return { ...prev, exceptions };
    });
    setExceptionEditor(null);
  };
  const orderedExceptions = form.exceptions
    .map((exception, index) => ({ exception, index }))
    .sort((a, b) => Number(!a.exception.date) - Number(!b.exception.date) || a.exception.date.localeCompare(b.exception.date));

  const exceptionSection = (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
      {(!exceptionsOnly || exceptionEditor !== null) && <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!exceptionsOnly && <AdminActionButton ref={addExceptionButton} tone="dark" onClick={addException} disabled={exceptionActionsDisabled} className="min-h-11 px-3 text-sm">
            <Plus className="h-3.5 w-3.5" />
            예외 일정 추가
          </AdminActionButton>}
          {exceptionEditor !== null && (
            <AdminActionButton
              tone="ghost"
              disabled={saving}
              onClick={() => {
                if (dirty && !window.confirm(exceptionsOnly
                  ? "저장하지 않은 변경사항을 폐기하고 편집을 닫으시겠습니까?"
                  : "저장하지 않은 변경사항이 있습니다. 편집을 닫으시겠습니까?")) return;
                if (exceptionsOnly && dirty && !discardChanges()) return;
                closeExceptionEditor();
              }}
              className="min-h-11 px-3 text-sm"
            >
              예외 일정 편집 닫기
            </AdminActionButton>
          )}
        </div>
      </div>}

      {form.exceptions.length === 0 ? (
        <div className="rounded-xl bg-[var(--background)]/72 px-4 py-3 text-sm text-[var(--muted)]">
          등록된 예외 일정이 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {orderedExceptions.map(({ exception, index }) => (
            exceptionEditor !== index ? (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 text-sm first:pt-0 last:pb-0">
                <div className="min-w-0 break-words">
                  <span className="font-medium">{formatExceptionDateLabel(exception.date)}</span>
                  {" · "}{exception.time || (exception.open ? "운영시간 미설정" : "휴진")}
                  {exception.note ? ` · ${exception.note}` : null}
                </div>
                <AdminActionButton
                  tone="dark"
                  aria-label={`${formatExceptionDateLabel(exception.date)} 예외 일정 편집`}
                  disabled={exceptionActionsDisabled}
                  onClick={() => openExceptionEditor(index)}
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
                className="grid min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/72 p-4 sm:grid-cols-2"
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

  const exceptionColumn = (
    <div className="min-w-0 space-y-4">
      {fallbackSyncFailed && <AdminNotice tone="warning">진료시간은 저장됐지만 장애 대비 사본을 갱신하지 못했습니다.</AdminNotice>}
      {loadError && <AdminErrorState message={`진료시간 조회 실패: ${loadError}`} onRetry={refetch} />}
      <HoursExceptionCalendar ref={calendarRegion} schedule={form.schedule} exceptions={form.exceptions}
        disabled={exceptionActionsDisabled || saving} notice={calendarNotice} onSelectDate={selectCalendarDate} />
      <SectionShell
        title="예외 일정"
        canEdit={false}
        description={EXCEPTION_DESCRIPTION}
        summary={EXCEPTION_DESCRIPTION}
        preview={exceptionSection}
        saving={saving}
        saved={saved}
        dirty={dirty}
        pendingSaveMessage="저장을 눌러야 서버에 반영됩니다."
        recovery={recovery}
        onSave={handleSave}
        saveError={saveError}
        additionalEditing={exceptionEditor !== null || dirty || saved}
      >
        {null}
      </SectionShell>
    </div>
  );

  const scheduleColumn = !exceptionsOnly && (
    <div className="@container min-w-0 space-y-6">
      {clinicCard}
      <SectionShell
        title="진료시간"
        description="요일별 운영 여부와 공지 문구를 함께 관리합니다."
        preview={<HoursScheduleSummary hours={form} />}
        saving={saving}
        saved={saved}
        dirty={dirty}
        recovery={recovery}
        onSave={handleSave}
        saveError={saveError}
      >
        <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
          <div className="hidden border-b border-[var(--border)]/50 px-4 py-2 @min-[440px]:grid @min-[440px]:grid-cols-[64px_62px_minmax(0,1fr)_minmax(0,1fr)]">
            <span className="text-xs font-medium text-[var(--muted)]">요일</span>
            <span className="text-xs font-medium text-[var(--muted)]">휴진</span>
            <span className="text-xs font-medium text-[var(--muted)]">시간</span>
            <span className="text-xs font-medium text-[var(--muted)]">비고</span>
          </div>
          {form.schedule.map((row, i) => (
            <div
              key={row.day}
              className={`grid items-center gap-3 px-4 py-4 @min-[440px]:grid-cols-[64px_62px_minmax(0,1fr)_minmax(0,1fr)] ${
                i === 0 ? "" : "border-t border-[var(--border)]/50"
              } ${row.open ? "bg-[var(--background)]" : "bg-[var(--background)]/60"}`}
            >
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{row.day}</div>
                <div className="mt-1 text-xs text-[var(--muted)] @min-[440px]:hidden">
                  {row.open ? "진료일" : "휴진"}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={!row.open}
                  onChange={(e) => setScheduleField(i, "open", !e.target.checked)}
                  aria-label={`${row.day} 휴진`}
                  className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                />
                휴진
              </label>

              <input
                type="text"
                value={row.time}
                onChange={(e) => setScheduleField(i, "time", e.target.value)}
                placeholder="09:30 - 18:30"
                className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
                aria-label={`${row.day} 진료 시간`}
              />

              <input
                type="text"
                value={row.note ?? ""}
                onChange={(e) => setScheduleField(i, "note", e.target.value)}
                placeholder="예: 야간진료"
                className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
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

  if (exceptionsOnly && !clinicCard) return exceptionColumn;
  return (
    <div className={SETTINGS_COLUMNS}>
      {exceptionsOnly ? clinicCard : scheduleColumn}
      {exceptionColumn}
    </div>
  );
}
