"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type Ref } from "react";
import { AdminActionButton, AdminSurface } from "@/components/admin/AdminChrome";
import { getTodayKST } from "@/lib/date";
import type { SiteHours } from "@/lib/site-config-supabase";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface HoursExceptionCalendarProps {
  schedule: SiteHours["schedule"];
  exceptions: SiteHours["exceptions"];
  disabled: boolean;
  notice: string | null;
  onSelectDate: (date: string, regularlyClosed: boolean, weekday: string) => void;
  ref?: Ref<HTMLDivElement>;
}

export function HoursExceptionCalendar({ schedule, exceptions, disabled, notice, onSelectDate, ref }: HoursExceptionCalendarProps) {
  const today = getTodayKST();
  const [month, setMonth] = useState(() => new Date(`${today.slice(0, 7)}-01T00:00:00Z`));
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const firstWeekday = month.getUTCDay();
  const byDate = new Map(exceptions.map((entry) => [entry.date, entry]));
  const closedWeekdays = new Set(schedule.filter((day) => !day.open).map((day) => day.day));

  function changeMonth(offset: number) {
    setMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1)));
  }

  return (
    <AdminSurface ref={ref} tabIndex={-1} tone="white" role="region" aria-label="휴진일 달력" className="-mx-2 rounded-2xl pb-2 sm:mx-0 sm:p-6">
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-0 sm:pt-0">
        <AdminActionButton tone="dark" aria-label="이전 달" onClick={() => changeMonth(-1)} className="size-12 shrink-0 p-0! focus-visible:outline-2 focus-visible:outline-blue-700">
          <ChevronLeft size={24} aria-hidden="true" />
        </AdminActionButton>
        <h2 aria-live="polite" className="text-lg font-semibold">{year}년 {monthIndex + 1}월</h2>
        <AdminActionButton tone="dark" aria-label="다음 달" onClick={() => changeMonth(1)} className="size-12 shrink-0 p-0! focus-visible:outline-2 focus-visible:outline-blue-700">
          <ChevronRight size={24} aria-hidden="true" />
        </AdminActionButton>
      </div>
      <div className="grid grid-cols-7 sm:gap-1">
        {WEEKDAYS.map((day) => <span key={day} aria-hidden="true" className="py-1 text-center text-xs text-[var(--muted)]">{day}</span>)}
        {Array.from({ length: firstWeekday }, (_, index) => <span key={index} aria-hidden="true" />)}
        {Array.from({ length: dayCount }, (_, index) => {
          const day = index + 1;
          const date = new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
          const entry = byDate.get(date);
          const weekday = `${WEEKDAYS[(firstWeekday + index) % 7]}요일`;
          const regularlyClosed = closedWeekdays.has(weekday);
          const status = entry ? (entry.open ? (regularlyClosed ? "정상진료" : "변경") : "휴진") : undefined;
          const closed = entry ? !entry.open : regularlyClosed;
          const accessibleStatus = status ?? (regularlyClosed ? "정기 휴진" : "");

          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              aria-label={`${year}년 ${monthIndex + 1}월 ${day}일${accessibleStatus ? ` ${accessibleStatus}` : ""}`}
              aria-current={date === today ? "date" : undefined}
              aria-pressed={!regularlyClosed && entry?.open ? undefined : Boolean(entry && entry.open === regularlyClosed)}
              onClick={() => onSelectDate(date, regularlyClosed, weekday)}
              className={`flex min-h-16 min-w-0 flex-col items-center justify-center rounded-lg text-base hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:opacity-50 aria-[current=date]:font-bold aria-pressed:bg-blue-100 ${closed ? "text-red-700" : ""}`}
            >
              <span>{day}</span>
              <span aria-hidden="true" className={`h-4 whitespace-nowrap text-[10px] leading-4 ${entry?.open ? "text-blue-800" : "text-red-700"}`}>
                {status}
              </span>
            </button>
          );
        })}
      </div>
      {notice && <p role="status" className="mt-2 text-sm text-red-700">{notice}</p>}
    </AdminSurface>
  );
}
