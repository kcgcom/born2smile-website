"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useRef, useState } from "react";
import { AdminActionButton } from "@/components/admin/AdminChrome";
import { getTodayKST } from "@/lib/date";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function EmergencyNoticeDatePicker({ date, disabled, onChange }: {
  date: string;
  disabled: boolean;
  onChange: (date: string) => void;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [month, setMonth] = useState(() => new Date(`${getTodayKST().slice(0, 7)}-01T00:00:00Z`));
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const today = getTodayKST();

  function openCalendar() {
    setMonth(new Date(`${(date || today).slice(0, 7)}-01T00:00:00Z`));
    dialog.current?.showModal();
  }

  function changeMonth(offset: number) {
    setMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1)));
  }

  return (
    <>
      <AdminActionButton type="button" tone="ghost" aria-haspopup="dialog" aria-label={date ? `종료 날짜 ${date}` : "종료 날짜 선택"}
        onClick={openCalendar} disabled={disabled} className="min-h-11 w-full justify-start border border-[var(--border)] bg-[var(--background)]">
        <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
        {date || "날짜 선택"}
      </AdminActionButton>
      <dialog ref={dialog} aria-labelledby={titleId}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto rounded-2xl border border-slate-300 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/45">
        <div className="space-y-3 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <AdminActionButton type="button" tone="ghost" aria-label="이전 달" onClick={() => changeMonth(-1)} className="size-11 p-0!">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </AdminActionButton>
            <h3 id={titleId} aria-live="polite" className="text-sm font-semibold">{year}년 {monthIndex + 1}월</h3>
            <AdminActionButton type="button" tone="ghost" aria-label="다음 달" onClick={() => changeMonth(1)} className="size-11 p-0!">
              <ChevronRight className="size-5" aria-hidden="true" />
            </AdminActionButton>
          </div>
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((day) => <span key={day} aria-hidden="true" className="py-1 text-xs text-slate-600">{day}</span>)}
            {Array.from({ length: month.getUTCDay() }, (_, index) => <span key={index} aria-hidden="true" />)}
            {Array.from({ length: dayCount }, (_, index) => {
              const day = index + 1;
              const dayDate = new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
              return (
                <button key={dayDate} type="button" aria-label={`${year}년 ${monthIndex + 1}월 ${day}일`}
                  aria-current={dayDate === today ? "date" : undefined} aria-pressed={dayDate === date}
                  onClick={() => { onChange(dayDate); dialog.current?.close(); }}
                  className="min-h-11 min-w-0 rounded-lg text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 aria-current:font-bold aria-pressed:bg-blue-100 aria-pressed:font-semibold">
                  {day}
                </button>
              );
            })}
          </div>
          <div className="flex justify-start border-t border-slate-200 pt-2">
            <AdminActionButton type="button" tone="ghost" onClick={() => onChange("")} className="min-h-11">지우기</AdminActionButton>
          </div>
        </div>
      </dialog>
    </>
  );
}
