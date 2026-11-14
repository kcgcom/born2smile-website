"use client";

import { AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import type { IndexingMonitorData } from "@/lib/admin-indexing-monitor";
import type { SiteHours } from "@/lib/site-config-supabase";
import { getTodayKST } from "@/lib/date";
import { MIN_REVIEW_RESPONSES, MIN_UNRESOLVED_RESPONSES, MIN_PREVIOUS_SEARCH_CLICKS, MIN_SEARCH_CLICK_DROP, MIN_SEARCH_DROP_PERCENT, OVERVIEW_WINDOW_DAYS, overviewContent, type SearchAttention } from "@/lib/admin-overview";
import { BASE_URL } from "@/lib/constants";
import { getBlogPostUrl } from "@/lib/blog/category-slugs";
import { AdminErrorState } from "./AdminErrorState";
import { useAdminApi } from "./useAdminApi";
import type { AdminBlogPost, BlogFeedbackData } from "./blog/blog-helpers";

const ANALYSIS_LINKS = [
  { title: "검색 성과", href: "/admin/analysis/search" },
  { title: "트래픽·읽기", href: "/admin/analysis/traffic" },
  { title: "문의·공유", href: "/admin/operations/conversion" },
  { title: "다음 콘텐츠 계획", href: "/admin/content/planner" },
];

export function GrowthOverviewPanel() {
  const posts = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");
  const feedback = useAdminApi<BlogFeedbackData>("/api/admin/blog-feedback");
  const indexing = useAdminApi<IndexingMonitorData>("/api/admin/indexing-status");
  const hours = useAdminApi<SiteHours>("/api/admin/site-config/hours");
  const searchAttention = useAdminApi<SearchAttention>("/api/admin/search-attention");
  const today = getTodayKST();
  const content = overviewContent(posts.data ?? [], feedback.data?.feedback ?? {}, today);
  const exceptions = (hours.data?.exceptions ?? []).filter(item => item.date >= today && item.date <= content.end).sort((a, b) => a.date.localeCompare(b.date));
  const failedChecks = indexing.data?.summary.failed ?? 0;
  const failedRun = indexing.data?.lastRun?.status === "failed";
  const postsByUrl = new Map((posts.data ?? []).filter(post => post.published && post.date && post.date <= today)
    .map(post => [`${BASE_URL}${getBlogPostUrl(post.slug, post.category)}`, post]));
  const searchReview = (searchAttention.data?.items ?? []).flatMap(item => {
    const post = postsByUrl.get(item.page);
    return post ? [{ ...item, post }] : [];
  });
  const sources = [
    { name: "포스트 목록", ...posts }, { name: "독자 응답", ...feedback },
    { name: "색인 상태", ...indexing }, { name: "진료시간", ...hours },
    { name: "검색 변화", ...searchAttention },
  ];
  const issues = sources.filter(source => source.error);
  const pending = sources.some(source => source.loading);

  return <div className="space-y-6">
    <header>
      <p className="text-sm font-medium text-blue-700">{today} · 한국시간</p>
      <h1 className="mt-1 text-xl font-bold text-slate-900">오늘 할 일</h1>
      <p className="mt-2 text-sm text-slate-600">처리할 문제, 검토할 글, 가까운 일정을 확인하고 해당 작업으로 이동하세요.</p>
    </header>

    <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
      <h2 className="text-base font-bold text-slate-900">지금 처리할 일</h2>
      {pending && <p role="status" className="mt-3 text-sm text-slate-600">운영 상태를 확인하는 중…</p>}
      {issues.map(source => <div key={source.name} className="mt-3"><p className="mb-1 text-sm font-semibold">{source.name} 조회 실패</p><AdminErrorState message={source.error!} onRetry={source.refetch} /></div>)}
      {!indexing.error && (failedChecks > 0 || failedRun) && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">{failedRun ? "최근 색인 점검 작업이 실패했습니다." : `색인 검사 ${failedChecks}건이 실패했습니다.`}</p>
        <p className="mt-1 text-sm text-amber-900">검색에 노출되지 않는다는 판정이 아니라, 검사 자체를 완료하지 못한 상태입니다.</p>
        <AdminActionLink tone="dark" href="/admin/analysis/indexing" className="mt-3">검사 실패 확인하기</AdminActionLink>
      </div>}
      {!pending && issues.length === 0 && sources.every(source => source.data) && !failedChecks && !failedRun && <p className="mt-3 text-sm text-slate-600">조회된 자료에서 즉시 처리할 오류는 없습니다.</p>}
      {!indexing.error && indexing.data && indexing.data.summary.needsAttention > 0 && <p className="mt-3 text-sm text-slate-600">색인 검토 후보 {indexing.data.summary.needsAttention}개 · 미색인·상태 변경만으로 운영 오류로 판정하지 않습니다. <a href="/admin/analysis/indexing" className="text-blue-700 underline">색인 상세 보기</a></p>}
    </AdminSurface>

    <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
      <h2 className="text-base font-bold text-slate-900">검토할 콘텐츠</h2>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <section aria-label="초안 검토">
          <h3 className="font-semibold text-slate-900">발행 전 초안</h3>
          {posts.loading ? <p className="mt-2 text-sm">초안 확인 중…</p> : posts.error || !posts.data ? <p className="mt-2 text-sm text-slate-600">목록을 확인하지 못해 초안 수를 표시하지 않습니다.</p> : <>
            <p className="mt-2 text-sm text-slate-600">미발행 초안 {content.drafts.length}건 · 초안이 있다는 것만으로 오류나 지연을 뜻하지 않습니다.</p>
            <ul className="mt-2 space-y-2">{content.drafts.slice(0, 3).map(post => <li key={post.slug}><a className="text-sm text-blue-700 underline" href={`/admin/content/posts/${post.slug}`}>{post.title}</a></li>)}</ul>
          </>}
          <AdminActionLink tone="dark" href="/admin/content/posts?status=draft" className="mt-3">초안 검토하기</AdminActionLink>
        </section>
        <section aria-label="미해결 응답 검토">
          <h3 className="font-semibold text-slate-900">미해결 응답이 모인 글</h3>
          <p className="mt-2 text-xs text-slate-500">DB 누적 응답 {MIN_REVIEW_RESPONSES}건 이상·미해결 {MIN_UNRESOLVED_RESPONSES}건 이상을 검토 후보로 보여줍니다. 글의 품질이나 불만족 판정이 아닙니다.</p>
          {posts.loading || feedback.loading ? <p role="status" className="mt-2 text-sm">응답 확인 중…</p> : posts.error || feedback.error || !feedback.data || !posts.data ? <p className="mt-2 text-sm text-slate-600">자료를 확인하지 못해 검토 후보를 판단하지 않습니다.</p> : content.review.length ? <ul className="mt-3 space-y-3">{content.review.slice(0, 3).map(post => <li key={post.slug} className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-900">{post.title}</p>
            <p className="mt-1 text-xs text-slate-600">총 응답 {post.responses.total}건 · 해결 {post.responses.solved} · 미해결 {post.responses.unresolved}</p>
            <a className="mt-2 inline-block text-sm text-blue-700 underline" href={`/admin/content/posts?performance=${encodeURIComponent(post.slug)}`}>근거와 성과 보기</a>
          </li>)}</ul> : <p className="mt-3 text-sm text-slate-600">현재 기준을 충족하는 검토 후보가 없습니다. 응답이 적은 글은 계속 관찰합니다.</p>}
        </section>
      </div>
      <section aria-label="검색 유입 변화 검토" className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="font-semibold text-slate-900">검색 유입이 줄어든 글</h3>
        <p className="mt-2 text-xs text-slate-500">두 기간 모두 기록이 있고, 이전 클릭 {MIN_PREVIOUS_SEARCH_CLICKS}회 이상·감소 {MIN_SEARCH_CLICK_DROP}회 이상·감소율 {MIN_SEARCH_DROP_PERCENT}% 이상인 공개 글입니다. 검색 변화가 곧 글의 품질 문제라는 뜻은 아닙니다.</p>
        {searchAttention.loading || posts.loading ? <p role="status" className="mt-2 text-sm">검색 변화 확인 중…</p>
          : searchAttention.error || posts.error ? <p className="mt-2 text-sm text-slate-600">자료를 확인하지 못해 검색 변화 후보를 판단하지 않습니다.</p>
          : !searchAttention.data?.configured ? <p className="mt-2 text-sm text-slate-600">검색 연결 설정이 필요합니다.</p>
          : searchAttention.data.truncated ? <p className="mt-2 text-sm text-slate-600">조회 결과가 잘려 있어 글별 변화를 판단하지 않습니다.</p>
          : <>
            <p className="mt-2 text-xs text-slate-500">최근 {searchAttention.data.start} ~ {searchAttention.data.end} / 이전 {searchAttention.data.previousStart} ~ {searchAttention.data.previousEnd} · Search Console PT 기준</p>
            {searchReview.length ? <ul className="mt-3 grid gap-3 md:grid-cols-3">{searchReview.slice(0, 3).map(item => <li key={item.post.slug} className="rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-900">{item.post.title}</p>
              <p className="mt-1 text-xs text-slate-600">검색 클릭 {item.previousClicks} → {item.clicks}회 ({Math.round(item.changePercent)}%)</p>
              <a href={`/admin/content/posts?performance=${encodeURIComponent(item.post.slug)}`} className="mt-2 inline-block text-sm text-blue-700 underline">검색과 글 성과 보기</a>
            </li>)}</ul> : <p className="mt-3 text-sm text-slate-600">현재 기준을 충족하는 검색 변화 후보가 없습니다.</p>}
          </>}
      </section>
    </AdminSurface>

    <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
      <h2 className="text-base font-bold text-slate-900">가까운 일정</h2>
      <p className="mt-1 text-xs text-slate-500">{today} ~ {content.end} · 앞으로 {OVERVIEW_WINDOW_DAYS}일</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <section aria-label="발행 예정">
          <h3 className="font-semibold text-slate-900">발행 예정 글</h3>
          {posts.loading ? <p className="mt-2 text-sm">일정 확인 중…</p> : posts.error || !posts.data ? <p className="mt-2 text-sm text-slate-600">발행 일정을 확인할 수 없습니다.</p> : content.scheduled.length ? <ul className="mt-3 space-y-2">{content.scheduled.slice(0, 5).map(post => <li key={post.slug} className="flex flex-wrap gap-x-3 gap-y-1 text-sm"><time dateTime={post.date} className="text-slate-600">{post.date}</time><a href={`/admin/content/posts/${post.slug}`} className="text-blue-700 underline">{post.title}</a></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">이 기간에 예약된 글이 없습니다.</p>}
          <AdminActionLink tone="dark" href="/admin/content/schedule" className="mt-3">발행 일정 보기</AdminActionLink>
        </section>
        <section aria-label="진료 일정 변경">
          <h3 className="font-semibold text-slate-900">휴진·진료시간 변경</h3>
          {hours.loading ? <p className="mt-2 text-sm">진료 일정 확인 중…</p> : hours.error || !hours.data ? <p className="mt-2 text-sm text-slate-600">진료시간 설정을 확인할 수 없습니다.</p> : <>
            {exceptions.length ? <ul className="mt-3 space-y-2">{exceptions.map(item => <li key={item.date} className="rounded-xl bg-slate-50 p-3 text-sm"><time dateTime={item.date}>{item.date}</time> · {item.open ? `변경 진료 ${item.time}` : "휴진"}{item.note && <p className="mt-1 text-slate-600">{item.note}</p>}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">현재 설정에 이 기간의 예외 일정이 없습니다.</p>}
            {hours.data.notice && <p className="mt-3 text-sm text-slate-600">현재 진료 안내: {hours.data.notice}</p>}
          </>}
          <AdminActionLink tone="dark" href="/admin/system/settings" className="mt-3">진료시간·휴진 설정</AdminActionLink>
        </section>
      </div>
    </AdminSurface>

    <details className="rounded-2xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">상세 분석으로 이동</summary>
      <div className="mt-3 flex flex-wrap gap-2">{ANALYSIS_LINKS.map(link => <AdminActionLink tone="dark" key={link.href} href={link.href}>{link.title}</AdminActionLink>)}</div>
    </details>
  </div>;
}
