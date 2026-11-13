"use client";

import { useEffect, useState } from "react";
import { dataAgeDays } from "./analytics-display";

interface DataFreshnessProps {
  dataAsOf?: string;
  period?: { start: string; end: string };
  comparePeriod?: { start: string; end: string };
  updatedAt?: number | null;
  isValidating?: boolean;
  expectedDelayDays?: number;
  onRefresh?: () => void;
}

export function DataFreshness({ dataAsOf, period, comparePeriod, updatedAt, isValidating, expectedDelayDays = 1, onRefresh }: DataFreshnessProps) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const age = dataAsOf && now ? dataAgeDays(dataAsOf, now) : null;
  const stale = age !== null && age > expectedDelayDays;
  const ageLabel = age === null ? "" : age === 0 ? "오늘" : age === 1 ? "1일 전" : `${age}일 전`;

  return (
    <div className={`rounded-xl border p-3 text-sm ${stale ? "border-amber-300 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          {period && <p>집계 기간: {period.start} ~ {period.end}</p>}
          {dataAsOf && <p>데이터 기준: {dataAsOf}{ageLabel && ` (${ageLabel} 데이터)`}</p>}
          {updatedAt && <p className="text-xs">응답 확인: {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(updatedAt)} KST · 원천 데이터 기준일과 다를 수 있습니다.</p>}
        </div>
        {onRefresh && <button type="button" onClick={onRefresh} disabled={isValidating} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-medium text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60">{isValidating ? "갱신 중…" : "데이터 다시 확인"}</button>}
      </div>
      <p role="status" className="mt-2 text-xs">{isValidating ? "최신 응답 확인 중입니다. 표시된 기준일의 데이터를 보고 있습니다." : stale ? "일반적인 반영 지연보다 오래된 데이터입니다. 기준일을 확인한 뒤 판단해 주세요." : "원천 서비스의 반영 지연이 있을 수 있습니다."}</p>
      {comparePeriod && <p className="mt-2 text-xs">증감률 비교: {comparePeriod.start} ~ {comparePeriod.end} 대비 상대 변화(%)입니다. CTR의 %p 차이가 아닙니다. 평균 순위는 숫자가 낮을수록 좋습니다.</p>}
    </div>
  );
}
