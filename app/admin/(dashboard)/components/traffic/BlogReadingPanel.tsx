"use client";

import { useState } from "react";
import { useAdminApi } from "../useAdminApi";
import { AdminErrorState } from "../AdminErrorState";
import { MetricCard } from "../MetricCard";
import { SectionCard } from "./SectionCard";
import { readingRate, type ReadingReport, type ReadingPeriod } from "@/lib/blog/reading-report";

function dateKST(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function BlogReadingPanel({ period, titles }: { period: ReadingPeriod; titles: Map<string, string> }) {
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const cursor = cursors.at(-1) ?? null;
  const page = cursors.length;
  const { data, loading, error, refetch } = useAdminApi<ReadingReport>(`/api/admin/posthog/reading?period=${period}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
  return (
    <SectionCard title="본문 읽기와 독자 반응 · PostHog">
      <p className="mb-4 text-sm text-[var(--muted)]">글 길이를 고려한 활성 시간과 본문 도달 깊이로 읽기를 추정합니다. 다음 글 이동은 평가에 포함하지 않습니다.</p>
      {loading && <p role="status">읽기 데이터를 불러오는 중…</p>}
      {error && <AdminErrorState message={error} onRetry={refetch} />}
      {!loading && !error && data && !data.configured && <p>PostHog 읽기 리포트 설정이 필요합니다.</p>}
      {!loading && !error && data?.configured && data.period === period && data.cursor === cursor && <>
        <p className="mb-3 text-xs text-[var(--muted)]">
          집계: {dateKST(data.meta.periodStart)} ~ {dateKST(new Date(Date.parse(data.meta.periodEndExclusive) - 1).toISOString())} KST · 전일까지 완료된 기간 · {data.meta.measurementVersion}
          <br />조회: {new Date(data.meta.fetchedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST
          {data.meta.firstObservedAt && <> · 최초 관찰: {dateKST(data.meta.firstObservedAt)}</>}
        </p>
        {data.warnings.map(warning => <p key={warning} role="status" className="my-2 text-sm text-amber-700">{warning}</p>)}
        {!data.meta.firstObservedAt && !data.meta.partial && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">측정 전 또는 수집 미확인입니다. 새 읽기 이벤트가 아직 관찰되지 않았으며 0% 성과를 뜻하지 않습니다.</p>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="측정 가능 세션·글" value={data.summary.eligibleVisits.toLocaleString("ko-KR")} />
          <MetricCard label="유효 읽기율 (추정)" value={readingRate(data.summary.qualified, data.summary.eligibleVisits)} />
          <MetricCard label="30초 이상 읽기" value={readingRate(data.summary.time30, data.summary.eligibleVisits)} />
          <MetricCard label="본문 75% 도달" value={readingRate(data.summary.depth75, data.summary.eligibleVisits)} />
        </div>
        <p className="my-3 text-xs text-[var(--muted)]">반복 진입은 세션·글별 한 번으로 계산합니다. 공유는 상세 방문 {data.summary.visits.toLocaleString("ko-KR")}건이 분모입니다. 표본 30건 미만은 참고용이며, 문의는 전화·카카오 실행으로 통화·예약 완료가 아닙니다.</p>
        {data.quality ? <p className="mb-4 text-xs text-[var(--muted)]">수집 점검: 속성 오류 {data.quality.invalidEvents}건 · 시작 없는 view {data.quality.orphanViews}건 · 중복 시작 {data.quality.duplicateStarts}건</p> : <p className="mb-4 text-xs text-amber-700">수집 품질 확인 불가</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">글별 본문 읽기와 반응, 세션·글 기준</caption>
            <thead><tr className="border-b border-[var(--border)]">{["글", "상세 / 읽기 표본", "유효 읽기", "해결 / 미해결", "공유", "문의 연관"].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-3">{label}</th>)}</tr></thead>
            <tbody>{data.rows.map(row => <tr key={row.slug} className="border-b border-[var(--border)]">
              <th scope="row" className="min-w-44 px-3 py-3 font-medium"><a href={row.path} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">{titles.get(row.slug) ?? row.slug}</a></th>
              <td className="px-3 py-3">{row.visits} / {row.eligibleVisits}{row.eligibleVisits < 30 && <span className="block whitespace-nowrap text-xs text-amber-700">표본 부족</span>}</td>
              <td className="px-3 py-3">{readingRate(row.qualified, row.eligibleVisits)}</td>
              <td className="px-3 py-3">{row.solved} / {row.unresolved}건</td>
              <td className="px-3 py-3">{readingRate(row.shares, row.visits)}</td>
              <td className="px-3 py-3">{row.inquiries}건</td>
            </tr>)}</tbody>
          </table>
        </div>
        {data.rows.length === 0 && <p className="py-4 text-sm">선택 기간에 표시할 글별 읽기 데이터가 없습니다.</p>}
        <p className="mt-3 text-xs text-[var(--muted)]">질문 해결 응답은 세션·글별 마지막 선택 기준입니다. 응답하지 않은 방문은 미해결로 세지 않습니다. 문의 연관은 같은 세션에서 글 이용 후 연락한 경우로, 여러 글에 중복될 수 있고 글의 인과 효과를 뜻하지 않습니다.</p>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setCursors(value => value.slice(0, -1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">이전 글 목록</button>
          <span>{page} / {Math.max(1, Math.ceil(data.totalPosts / data.pageSize))}</span>
          <button type="button" disabled={!data.nextCursor} onClick={() => setCursors(value => [...value, data.nextCursor])} className="rounded-lg border px-3 py-2 disabled:opacity-40">다음 글 목록</button>
        </div>
      </>}
    </SectionCard>
  );
}
