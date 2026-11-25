"use client";

import dynamic from "next/dynamic";
import type { CruxData } from "@/app/api/dev/crux/route";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "./AdminErrorState";
import { useAdminApi } from "./useAdminApi";

const METRICS = [
  { id: "lcp", label: "LCP", unit: "ms", description: "첫 화면에서 가장 큰 이미지나 텍스트가 보일 때까지 걸린 시간입니다. 2.5초 이하면 양호합니다." },
  { id: "inp", label: "INP", unit: "ms", description: null },
  { id: "cls", label: "CLS", unit: "", description: "페이지를 보는 동안 화면 요소가 예기치 않게 밀리는 정도입니다. 0.10 이하면 양호합니다." },
] as const;

function formatMetric(value: number | null | undefined, unit: string) {
  if (value == null) return "데이터 없음";
  return unit ? `${value.toLocaleString("ko-KR")} ${unit}` : value.toFixed(2);
}

const TrendChart = dynamic(
  () => import("recharts").then(({ ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip }) => {
    return function Chart({ history, metric }: { history: CruxData["history"]; metric: typeof METRICS[number] }) {
      return (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={history} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <XAxis dataKey="end" tickFormatter={(date: string) => date.slice(5)} tick={{ fontSize: 11 }} minTickGap={18} />
            <YAxis width={48} tick={{ fontSize: 11 }} domain={[0, "auto"]} />
            <Tooltip formatter={value => [typeof value === "number" ? formatMetric(value, metric.unit) : "", metric.label]} />
            <Line dataKey={metric.id} stroke="#1d4ed8" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    };
  }),
  { ssr: false, loading: () => <div className="h-40" role="status">차트 불러오는 중…</div> },
);

export function CruxPanel() {
  const { data, loading, error, refetch } = useAdminApi<CruxData>("/api/dev/crux");
  const history = data?.history ?? [];
  const historyMetrics = METRICS.filter(metric => history.some(point => point[metric.id] != null));

  return (
    <AdminSurface tone="white" className="space-y-4 rounded-2xl p-4 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">실사용 성능 추세</h2>
        <p className="mt-1 text-xs text-slate-600">전체 사이트 · 모든 기기 · Chrome 실사용 데이터(CrUX)</p>
      </div>
      {loading && !data && <p role="status" className="text-sm text-slate-600">CrUX 데이터 불러오는 중…</p>}
      {error && <AdminErrorState message={error} onRetry={refetch} />}
      {data && (
        <>
          <div>
            <h3 className="text-sm font-medium text-slate-900">최신 28일 p75</h3>
            {data.latest && <p className="mt-1 text-xs text-slate-600">{data.latest.start} ~ {data.latest.end}</p>}
            {data.latestError ? <p role="status" className="mt-1 text-sm text-slate-600">{data.latestError}</p> : (
              <dl className="mt-2 grid grid-cols-3 gap-2">
                {METRICS.map(metric => (
                  <div key={metric.id} className="rounded-lg bg-slate-50 p-2 sm:p-3">
                    <dt className="text-xs text-slate-600">{metric.label}</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">{formatMetric(data.latest?.[metric.id], metric.unit)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {historyMetrics.length ? (
            <>
              <p className="text-xs text-slate-600">각 점은 해당 날짜까지의 28일 집계입니다. 주간 집계가 겹치며, 값이 없는 기간은 비워 표시합니다.</p>
              <div className="grid gap-4 lg:grid-cols-2">
                {historyMetrics.map(metric => (
                  <div key={metric.id} className="min-w-0">
                    <h3 className="text-sm font-medium text-slate-900">{metric.label} 추세{metric.unit && ` (${metric.unit})`}</h3>
                    {metric.description && <p className="mt-1 text-xs leading-5 text-slate-600">{metric.description}</p>}
                    <TrendChart history={history} metric={metric} />
                  </div>
                ))}
              </div>
              <details className="text-sm text-slate-700">
                <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-blue-700">기간별 수치 보기</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr><th scope="col">수집 기간</th>{METRICS.map(metric => <th key={metric.id} scope="col" className="p-2">{metric.label}</th>)}</tr></thead>
                    <tbody>
                      {history.toReversed().map(point => (
                        <tr key={point.end} className="border-t border-slate-200">
                          <th scope="row" className="py-2 font-normal">{point.start} ~ {point.end}</th>
                          {METRICS.map(metric => <td key={metric.id} className="p-2">{formatMetric(point[metric.id], metric.unit)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : <p role="status" className="text-sm text-slate-600">{data.historyError ? `주간 추세 · ${data.historyError}` : "표시할 주간 추세 데이터가 없습니다."}</p>}
        </>
      )}
    </AdminSurface>
  );
}
