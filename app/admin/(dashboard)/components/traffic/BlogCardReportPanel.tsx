import type { BlogCardReport } from "@/lib/admin-blog-cards";
import type { ReadingPeriod } from "@/lib/blog/reading-report";
import { AdminErrorState } from "../AdminErrorState";
import { MetricCard } from "../MetricCard";
import { SectionCard } from "./SectionCard";

const DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const COUNT = new Intl.NumberFormat("ko-KR");

export function BlogCardReportPanel({ period, data, error, loading, refetch }: {
  period: ReadingPeriod;
  data: BlogCardReport | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}) {
  const report = data?.configured && data.period === period ? data : null;

  return (
    <SectionCard title="블로그 카드 노출·클릭 · PostHog">
      {error ? <AdminErrorState message={error} onRetry={refetch} />
        : loading ? <p role="status">카드 성과를 불러오는 중…</p>
        : data?.configured === false ? <p>PostHog 연결 설정이 필요합니다.</p>
        : report && (
          <>
            <p className="mb-3 text-xs text-slate-600">
              {DATE.format(new Date(report.range.periodStart))} ~ {DATE.format(new Date(Date.parse(report.range.periodEndExclusive) - 1))} · 한국시간
            </p>
            {report.impressions === 0 && report.clicks === 0 ? (
              <p className="text-sm text-slate-600">선택 기간에 수집된 카드 데이터가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="카드 노출" value={`${COUNT.format(report.impressions)}건`} />
                <MetricCard label="카드 클릭" value={`${COUNT.format(report.clicks)}건`} />
              </div>
            )}
            <p className="mt-3 text-xs text-slate-600">카드의 50% 이상이 1초 동안 보이면 노출로 집계합니다. 노출 기준을 충족하기 전에 누른 카드도 클릭에 포함됩니다.</p>
          </>
        )}
    </SectionCard>
  );
}
