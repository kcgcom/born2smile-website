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
  metricHelp?: string;
}

export function DataFreshness({ dataAsOf, period, comparePeriod, updatedAt, isValidating, expectedDelayDays = 1, onRefresh, metricHelp }: DataFreshnessProps) {
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
    <div className={`relative rounded-xl border p-3 text-sm lg:grid lg:min-w-96 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-3 lg:gap-y-1 lg:py-2 ${stale ? "border-amber-300 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <div className="space-y-1 lg:text-xs">
          {period && <p>집계 기간: {period.start} ~ {period.end}</p>}
          {comparePeriod && <p>직전 기간: {comparePeriod.start} ~ {comparePeriod.end}</p>}
          {dataAsOf && <p>데이터 기준: {dataAsOf}{ageLabel && ` (${ageLabel} 데이터)`}</p>}
        </div>
      </div>
      {(isValidating || stale) && <p role="status" className="mt-2 text-xs lg:col-start-1 lg:row-start-2 lg:mt-0">{isValidating ? "응답 갱신 중 · 표시된 기준일을 확인하세요." : "데이터 반영 지연 · 기준일 확인 필요"}</p>}
      <div className="mt-1 flex flex-wrap items-start justify-between gap-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center">
        <details className="min-w-0 flex-1 text-xs open:basis-full lg:flex-none lg:open:basis-auto">
          <summary className="min-h-11 cursor-pointer py-3 font-medium">집계·해석 기준</summary>
          <div className="space-y-2 pb-2 lg:absolute lg:right-0 lg:top-full lg:z-20 lg:w-96 lg:max-w-[calc(100vw-3rem)] lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:p-4 lg:text-slate-700 lg:shadow-lg">
            {updatedAt && <p>응답 확인: {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(updatedAt)} KST · 원천 데이터 기준일과 다를 수 있습니다.</p>}
            <p>원천 서비스의 반영 지연이 있을 수 있습니다.</p>
            {comparePeriod && <p>증감률은 직전 기간 대비 상대 변화(%)입니다.</p>}
            {metricHelp && <p>{metricHelp}</p>}
          </div>
        </details>
        {onRefresh && <button type="button" onClick={onRefresh} disabled={isValidating} className="min-h-11 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60">{isValidating ? "갱신 중…" : "데이터 다시 확인"}</button>}
      </div>
    </div>
  );
}
