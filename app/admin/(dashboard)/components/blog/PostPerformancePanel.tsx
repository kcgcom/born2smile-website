"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useModalA11y } from "@/hooks/useModalA11y";
import { getTodayKST } from "@/lib/date";
import { getAdminPreviewUrl, getBlogPostUrl } from "@/lib/blog/category-slugs";
import { isPublicPerformancePost, type PerformanceSource, type PostPerformance, type PerformancePeriod } from "@/lib/post-performance";
import { readingRate } from "@/lib/blog/reading-report";
import { useAdminApi } from "../useAdminApi";
import { MetricCard } from "../MetricCard";
import { AdminErrorState } from "../AdminErrorState";
import type { AdminBlogPost } from "./blog-helpers";

function Source<T>({ title, source, children }: { title: string; source: PerformanceSource<T>; children: (data: T) => ReactNode }) {
  return <section aria-label={title} className="rounded-2xl border border-slate-200 bg-white p-4">
    <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
    {source.status === "ready" ? children(source.data) : <p className={source.status === "error" ? "text-sm text-red-700" : "text-sm text-slate-600"} role={source.status === "error" ? "status" : undefined}>{source.message}</p>}
  </section>;
}

export function PostPerformancePanel({ post, onClose }: { post: AdminBlogPost; onClose: () => void }) {
  const [period, setPeriod] = useState<PerformancePeriod>("30d");
  const modal = useModalA11y(onClose);
  const isPublic = isPublicPerformancePost(post, getTodayKST());
  const { data, loading, error, refetch } = useAdminApi<PostPerformance>(`/api/admin/blog-posts/${encodeURIComponent(post.slug)}/performance?period=${period}`, isPublic);
  const report = data?.post?.slug === post.slug && data.period === period ? data : null;
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, []);
  return <div ref={modal} role="dialog" aria-modal="true" aria-label={`${post.title} 성과`} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4" onClick={onClose}>
    <div className="max-h-[92vh] w-full max-w-4xl space-y-4 overflow-y-auto rounded-3xl bg-slate-50 p-4 shadow-2xl sm:p-6" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-semibold text-blue-700">포스트 성과</p><h2 className="mt-1 text-lg font-bold text-slate-900">{post.title}</h2></div>
        <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-xl border border-slate-300 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-blue-700">닫기</button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>상태: {!post.published ? "초안" : isPublic ? "공개" : "발행 예약"}</span>
        <span>발행일: {post.date || "미정"}</span><span>마지막 수정일: {post.dateModified || "기록 없음"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/content/posts/${post.slug}`} className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">본문·제목 수정</Link>
        <a href={isPublic ? getBlogPostUrl(post.slug, post.category) : getAdminPreviewUrl(post.slug, post.category)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm">{isPublic ? "실제 페이지 열기" : "미리보기 열기"}</a>
      </div>
      {!isPublic ? <p className="rounded-2xl bg-white p-5 text-sm text-slate-600">공개 발행 후 성과를 확인할 수 있습니다. 초안·예약 글에 조회 수 0이나 해결률 0%를 표시하지 않습니다.</p> : <>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">조회 기간 <select aria-label="포스트 성과 조회 기간" value={period} onChange={event => setPeriod(event.target.value as PerformancePeriod)} className="ml-2 min-h-11 rounded-xl border border-slate-300 bg-white px-3"><option value="30d">30일</option><option value="90d">90일</option></select></label>
          <button type="button" onClick={refetch} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">성과 새로고침</button>
        </div>
        {loading && <p role="status" className="text-sm text-slate-600">포스트 성과를 불러오는 중…</p>}
        {error && <AdminErrorState message={error} onRetry={refetch} />}
        {!loading && !error && report && <>
          <p className="text-sm text-slate-600">기간별 성과: {report.range.start} ~ {report.range.end}<br /><span className="text-xs">검색 반영 지연을 고려해 3일 전까지의 같은 날짜 범위를 조회합니다. 조회 시각: {new Date(report.fetchedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST</span></p>
          {report.partial && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">일부 데이터를 불러오지 못했습니다. 조회된 다른 결과는 그대로 확인할 수 있습니다.</p>}
          <Source title="누적 독자 응답 · DB" source={report.feedback}>{feedback => <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="총 응답" value={`${feedback.total}건`} />
              <MetricCard label="해결" value={`${feedback.solved}건`} />
              <MetricCard label="미해결" value={`${feedback.unresolved}건`} />
              <MetricCard label="응답 중 해결 비율" value={feedback.total ? readingRate(feedback.solved, feedback.total) : "응답 없음"} />
            </div>
            <p className="mt-3 text-xs text-slate-600">조회 기간과 무관한 현재 누적 최종 응답입니다. 미응답은 미해결이 아니며 전체 독자의 만족도를 뜻하지 않습니다.{feedback.total > 0 && feedback.total < 5 ? " 응답 표본이 적어 참고용으로만 보세요." : ""}</p>
          </>}</Source>
          <Source title="검색 유입 · Search Console" source={report.search}>{search => <>
            <div className="grid grid-cols-2 gap-3"><MetricCard label="검색 노출" value={`${search.impressions.toLocaleString("ko-KR")}회`} /><MetricCard label="검색 클릭" value={`${search.clicks.toLocaleString("ko-KR")}회`} /></div>
            {!search.queriesAvailable ? <p className="mt-3 text-sm text-amber-800">유입 검색어 조회 실패</p> : search.queries.length ? <ul className="mt-3 divide-y divide-slate-100">{search.queries.map(item => <li key={item.query} className="flex justify-between gap-3 py-2 text-sm"><span className="min-w-0 break-words">{item.query}</span><span className="shrink-0 text-slate-600">클릭 {item.clicks}회</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-600">표시할 유입 검색어가 없습니다.</p>}
            <p className="mt-3 text-xs text-slate-500">정규 URL 기준 · 미국 태평양 시간(PT). 검색어는 일부만 공개되므로 검색어 클릭 합계가 전체 클릭과 다를 수 있습니다.</p>
          </>}</Source>
          <Source title="방문 · GA4" source={report.traffic}>{traffic => <>
            <div className="grid grid-cols-2 gap-3"><MetricCard label="페이지뷰" value={`${traffic.views.toLocaleString("ko-KR")}회`} /><MetricCard label="방문 세션" value={`${traffic.sessions.toLocaleString("ko-KR")}개`} /></div>
            <p className="mt-3 text-xs text-slate-500">이 글의 경로를 직접 조회 · {traffic.timeZone} 기준{traffic.thresholded ? " · 개인정보 보호 기준으로 일부 데이터가 생략될 수 있습니다." : ""}</p>
          </>}</Source>
          <Source title="읽기·후속 행동 · PostHog" source={report.reading}>{reading => <>
            {!reading.firstObservedAt && <p className="mb-3 text-sm text-slate-600">이 글의 읽기 측정 전 또는 수집 미확인입니다.</p>}
            {reading.firstObservedAt && Date.parse(reading.firstObservedAt) >= Date.parse(report.range.periodEndExclusive) && <p className="mb-3 text-sm text-slate-600">선택 기간이 이 글의 읽기 수집 시작보다 앞섭니다.</p>}
            <div className="grid grid-cols-2 gap-3"><MetricCard label="읽기 표본 (세션·글)" value={`${reading.counts.eligibleVisits}개`} /><MetricCard label="유효 읽기율 (추정)" value={readingRate(reading.counts.qualified, reading.counts.eligibleVisits)} /><MetricCard label="공유 동작 방문" value={`${reading.counts.shares}건`} /><MetricCard label="글 이용 후 문의 시도" value={`${reading.counts.inquiries}건`} /></div>
            {reading.counts.eligibleVisits < 30 && <p className="mt-3 text-sm text-amber-800">읽기 표본 부족 · 우열을 판단하지 않습니다.</p>}
            {reading.warnings.map(warning => <p key={warning} className="mt-2 text-sm text-amber-800">{warning}</p>)}
            <p className="mt-3 text-xs text-slate-500">KST 기준. 문의는 같은 세션에서 글 이용 이후 전화·카카오를 실행한 경우이며, 실제 상담·예약이나 글의 인과 효과가 아닙니다.</p>
          </>}</Source>
          <p className="text-xs text-slate-500">서비스별 시간대·수집 대상이 달라 서로 다른 출처의 수치를 나눠 전환율로 계산하지 않습니다. 카드 노출·클릭 집계는 이번 패널에 포함하지 않습니다.</p>
        </>}
      </>}
    </div>
  </div>;
}
