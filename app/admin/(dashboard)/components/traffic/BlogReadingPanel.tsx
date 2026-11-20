"use client";

import { useState } from "react";
import { useAdminApi } from "../useAdminApi";
import { AdminErrorState } from "../AdminErrorState";
import { DataTable } from "../DataTable";
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
      {!loading && !error && data && !data.configured && <p>연결 필요 · PostHog 조회 설정을 확인하세요.</p>}
      {!loading && !error && data?.configured && data.period === period && data.cursor === cursor && <>
        <p className="mb-3 text-xs text-[var(--muted)]">
          집계: {dateKST(data.meta.periodStart)} ~ {dateKST(new Date(Date.parse(data.meta.periodEndExclusive) - 1).toISOString())} KST · 전일까지 완료된 기간 · {data.meta.measurementVersion}
          <br />조회: {new Date(data.meta.fetchedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST
          {data.meta.firstObservedAt && <> · 최초 관찰: {dateKST(data.meta.firstObservedAt)}</>}
        </p>
        {data.warnings.map(warning => <p key={warning} role="status" className="my-2 text-sm text-amber-700">{warning}</p>)}
        {data.summary.visits === 0 && <p className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">선택 기간에 조회된 본문 읽기 데이터가 없습니다.</p>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="측정 가능 세션·글" value={data.summary.visits ? data.summary.eligibleVisits.toLocaleString("ko-KR") : "—"} />
          <MetricCard label="유효 읽기율 (추정)" value={readingRate(data.summary.qualified, data.summary.eligibleVisits)} />
          <MetricCard label="30초 이상 읽기" value={readingRate(data.summary.time30, data.summary.eligibleVisits)} />
          <MetricCard label="본문 75% 도달" value={readingRate(data.summary.depth75, data.summary.eligibleVisits)} />
        </div>
        <p className="my-3 text-xs text-[var(--muted)]">반복 진입은 세션·글별 한 번으로 계산합니다. 공유는 상세 방문 {data.summary.visits.toLocaleString("ko-KR")}건이 분모입니다. 표본 30건 미만은 참고용이며, 문의는 전화·카카오 실행으로 통화·예약 완료가 아닙니다.</p>
        {data.quality ? <p className="mb-4 text-xs text-[var(--muted)]">수집 점검: 속성 오류 {data.quality.invalidEvents}건 · 시작 없는 view {data.quality.orphanViews}건 · 중복 시작 {data.quality.duplicateStarts}건</p> : <p className="mb-4 text-xs text-amber-700">수집 품질 확인 불가</p>}
        <DataTable mobileCards
          columns={[
            { key: "slug", label: "글", render: row => <a href={row.path} target="_blank" rel="noopener noreferrer" className="min-h-11 inline-flex items-center text-blue-800 underline">{titles.get(row.slug) ?? row.slug}<span className="sr-only"> (새 창)</span></a> },
            { key: "eligibleVisits", label: "상세 / 읽기 표본", render: row => <>{row.visits} / {row.eligibleVisits}{row.eligibleVisits < 30 && <span className="block text-xs text-amber-700">표본 부족</span>}</> },
            { key: "qualified", label: "유효 읽기", render: row => readingRate(row.qualified, row.eligibleVisits) },
            { key: "solved", label: "해결 / 미해결", render: row => <>{row.solved} / {row.unresolved}건</> },
            { key: "shares", label: "공유", render: row => readingRate(row.shares, row.visits) },
            { key: "inquiries", label: "문의 연관", render: row => <>{row.inquiries}건</> },
          ]}
          rows={data.rows} keyField="slug" emptyMessage="선택 기간에 표시할 글별 읽기 데이터가 없습니다."
        />

        <details className="mt-3 text-xs text-[var(--muted)]"><summary className="min-h-11 cursor-pointer py-3 font-medium">독자 반응 해석 기준</summary><p className="pb-3 leading-5">질문 해결 응답은 세션·글별 마지막 선택 기준입니다. 응답하지 않은 방문은 미해결로 세지 않습니다. 문의 연관은 같은 세션에서 글 이용 후 연락한 경우로, 여러 글에 중복될 수 있고 글의 인과 효과를 뜻하지 않습니다.</p></details>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setCursors(value => value.slice(0, -1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">이전 글 목록</button>
          <span>{page} / {Math.max(1, Math.ceil(data.totalPosts / data.pageSize))}</span>
          <button type="button" disabled={!data.nextCursor} onClick={() => setCursors(value => [...value, data.nextCursor])} className="rounded-lg border px-3 py-2 disabled:opacity-40">다음 글 목록</button>
        </div>
      </>}
    </SectionCard>
  );
}
