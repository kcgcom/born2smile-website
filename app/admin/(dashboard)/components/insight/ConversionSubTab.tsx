"use client";

import { MousePointerClick, PhoneCall, Route, ScrollText } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "../DataTable";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { MetricCard } from "../MetricCard";
import { PeriodSelector } from "../PeriodSelector";
import { ApiSourceBadge } from "./ApiSourceBadge";
import { useAdminApi } from "../useAdminApi";
import type { AdminBlogPost } from "../blog/blog-helpers";

interface ConversionData {
  configured: boolean;
  period: "30d" | "90d" | "180d";
  summary: {
    totalCtaClicks: number;
    totalPhoneClicks: number;
    totalContactClicks: number;
    contactPageViews: number;
    contactToPhoneRate: number | null;
    totalShareActions: number;
    totalShareVisits: number;
    shareVisitRate: number | null;
    nativeShareActions: number;
    copyShareActions: number;
  };
  byLocation: Array<{
    ctaLocation: string;
    clicks: number;
    percentage: number;
  }>;
  topPages: Array<{
    pagePath: string;
    totalClicks: number;
    phoneClicks: number;
    contactClicks: number;
  }>;
  topBlogPosts: Array<{
    slug: string;
    totalClicks: number;
    phoneClicks: number;
    contactClicks: number;
  }>;
  topSharedBlogPosts: Array<{
    slug: string;
    shareActions: number;
    shareVisits: number;
    visitRate: number | null;
    copiedShares: number;
    nativeShares: number;
  }>;
  shareSources: Array<{
    shareSource: string;
    shareActions: number;
    shareVisits: number;
    visitRate: number | null;
  }>;
}

const PERIODS = [
  { value: "30d", label: "1개월" },
  { value: "90d", label: "3개월" },
  { value: "180d", label: "6개월" },
] as const;

const PERIOD_LABELS: Record<ConversionData["period"], string> = {
  "30d": "30일",
  "90d": "90일",
  "180d": "180일",
};

const SHARE_SOURCE_LABELS: Record<string, string> = {
  header_cta: "상단 CTA",
  footer_cta: "하단 CTA",
  mobile_sticky_cta: "모바일 고정 CTA",
  list_card: "목록 카드",
  "(unknown)": "미확인",
};

export function ConversionSubTab() {
  const [period, setPeriod] = useState<"30d" | "90d" | "180d">("30d");
  const { data, loading, error, refetch } = useAdminApi<ConversionData>(
    `/api/admin/posthog/conversion?period=${period}`,
  );
  const { data: postsData } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");
  const slugToTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const post of postsData ?? []) map.set(post.slug, post.title);
    return map;
  }, [postsData]);
  const slugToCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const post of postsData ?? []) map.set(post.slug, post.category);
    return map;
  }, [postsData]);

  return (
    <div className="space-y-6">
      <ApiSourceBadge sources={["posthog"]} />

      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector
          periods={PERIODS.map((item) => ({ value: item.value, label: item.label }))}
          selected={period}
          onChange={(value) => setPeriod(value as "30d" | "90d" | "180d")}
        />
        {data && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            ⓘ PostHog 이벤트 기준 · {period}
          </span>
        )}
      </div>

      {error && <AdminErrorState message={error} onRetry={refetch} />}

      {loading && <AdminLoadingSkeleton variant="metrics" />}

      {!loading && !error && data && !data.configured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          PostHog 관리자 조회용 환경변수가 없습니다. `POSTHOG_PROJECT_ID`,
          `POSTHOG_API_KEY`, `POSTHOG_BASE_URL`를 설정하면 전환 리포트를 표시합니다.
        </div>
      )}

      {!loading && !error && data?.configured && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label={`${PERIOD_LABELS[data.period]} CTA 클릭`}
              value={data.summary.totalCtaClicks.toLocaleString("ko-KR")}
              color="text-[var(--color-primary)]"
            />
            <MetricCard
              label={`${PERIOD_LABELS[data.period]} 전화 클릭`}
              value={data.summary.totalPhoneClicks.toLocaleString("ko-KR")}
              color="text-emerald-700"
            />
            <MetricCard
              label={`${PERIOD_LABELS[data.period]} 상담 페이지뷰`}
              value={data.summary.contactPageViews.toLocaleString("ko-KR")}
              color="text-[var(--color-gold-dark)]"
            />
            <MetricCard
              label="/contact → 전화"
              value={
                data.summary.contactToPhoneRate === null
                  ? "—"
                  : `${data.summary.contactToPhoneRate}%`
              }
              color="text-[var(--foreground)]"
            />
            <MetricCard
              label={`${PERIOD_LABELS[data.period]} 공유 시도`}
              value={data.summary.totalShareActions.toLocaleString("ko-KR")}
              color="text-sky-700"
            />
            <MetricCard
              label={`${PERIOD_LABELS[data.period]} 공유 유입`}
              value={data.summary.totalShareVisits.toLocaleString("ko-KR")}
              color="text-violet-700"
            />
          </div>

          <section>
            <SectionTitle
              icon={Route}
              title="블로그 공유 성과"
              subtitle={`${PERIOD_LABELS[data.period]} 기준 공유 시도와 실제 공유 유입을 함께 확인합니다`}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <MetricCard
                label="공유 유입률"
                value={
                  data.summary.shareVisitRate === null
                    ? "—"
                    : `${data.summary.shareVisitRate}%`
                }
                color="text-violet-700"
              />
              <MetricCard
                label="네이티브 공유"
                value={data.summary.nativeShareActions.toLocaleString("ko-KR")}
                color="text-sky-700"
              />
              <MetricCard
                label="링크 복사"
                value={data.summary.copyShareActions.toLocaleString("ko-KR")}
                color="text-[var(--color-gold-dark)]"
              />
              <MetricCard
                label="공유 후 유입"
                value={data.summary.totalShareVisits.toLocaleString("ko-KR")}
                color="text-emerald-700"
              />
              <MetricCard
                label="총 공유 시도"
                value={data.summary.totalShareActions.toLocaleString("ko-KR")}
                color="text-[var(--color-primary)]"
              />
            </div>
          </section>

          <section>
            <SectionTitle
              icon={MousePointerClick}
              title="공유 버튼 위치별 성과"
              subtitle="어느 위치의 공유 버튼이 실제로 사용되는지 확인합니다"
            />
            <DataTable
              columns={[
                {
                  key: "shareSource",
                  label: "공유 위치",
                  align: "left",
                  render: (row) => SHARE_SOURCE_LABELS[row.shareSource] ?? row.shareSource,
                },
                { key: "shareActions", label: "공유 시도", align: "right" },
                { key: "shareVisits", label: "공유 유입", align: "right" },
                {
                  key: "visitRate",
                  label: "유입률",
                  align: "right",
                  render: (row) => row.visitRate === null ? "—" : `${row.visitRate}%`,
                },
              ]}
              rows={data.shareSources}
              keyField="shareSource"
              emptyMessage="공유 위치 데이터가 없습니다"
            />
          </section>

          <section>
            <SectionTitle
              icon={MousePointerClick}
              title="CTA 위치별 성과"
              subtitle="cta_location 기준 클릭 분포"
            />
            <DataTable
              columns={[
                { key: "ctaLocation", label: "위치", align: "left" },
                { key: "clicks", label: "클릭", align: "right" },
                {
                  key: "percentage",
                  label: "비중",
                  align: "right",
                  render: (row) => `${row.percentage}%`,
                },
              ]}
              rows={data.byLocation}
              keyField="ctaLocation"
              emptyMessage="집계된 CTA 위치 데이터가 없습니다"
            />
          </section>

          <section>
            <SectionTitle
              icon={Route}
              title="전환 페이지 TOP"
              subtitle="어떤 페이지가 CTA 클릭을 가장 많이 만들었는지 확인합니다"
            />
            <DataTable
              columns={[
                { key: "pagePath", label: "페이지", align: "left" },
                { key: "totalClicks", label: "총 클릭", align: "right" },
                { key: "phoneClicks", label: "전화", align: "right" },
                { key: "contactClicks", label: "상담", align: "right" },
              ]}
              rows={data.topPages}
              keyField="pagePath"
              emptyMessage="집계된 페이지 데이터가 없습니다"
            />
          </section>

          <section>
            <SectionTitle
              icon={ScrollText}
              title="블로그 기여 TOP"
              subtitle="어떤 글이 상담 CTA로 가장 잘 이어졌는지 확인합니다"
            />
            <DataTable
              columns={[
                { key: "slug", label: "슬러그", align: "left" },
                { key: "totalClicks", label: "총 클릭", align: "right" },
                { key: "phoneClicks", label: "전화", align: "right" },
                { key: "contactClicks", label: "상담", align: "right" },
              ]}
              rows={data.topBlogPosts}
              keyField="slug"
              emptyMessage="블로그 CTA 클릭 데이터가 없습니다"
            />
          </section>

          <section>
            <SectionTitle
              icon={ScrollText}
              title="공유된 블로그 TOP"
              subtitle="어떤 글이 가장 많이 공유되고 실제 유입까지 이어졌는지 확인합니다"
            />
            <DataTable
              columns={[
                {
                  key: "slug",
                  label: "글 제목",
                  align: "left",
                  render: (row) => (
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[var(--foreground)]">
                        {slugToTitleMap.get(row.slug) ?? row.slug}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        {slugToCategoryMap.get(row.slug) ? (
                          <a
                            href={`/blog/${slugToCategoryMap.get(row.slug)}/${row.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-primary)] hover:underline"
                          >
                            글 보기
                          </a>
                        ) : (
                          <span className="text-[var(--muted)]">글 경로 없음</span>
                        )}
                        <span className="text-[var(--border)]">·</span>
                        <a
                          href={`/admin/content/posts/${encodeURIComponent(row.slug)}`}
                          className="text-[var(--color-gold-dark)] hover:underline"
                        >
                          수정
                        </a>
                      </div>
                    </div>
                  ),
                },
                { key: "shareActions", label: "공유 시도", align: "right" },
                { key: "shareVisits", label: "공유 유입", align: "right" },
                {
                  key: "visitRate",
                  label: "유입률",
                  align: "right",
                  render: (row) => row.visitRate === null ? "—" : `${row.visitRate}%`,
                },
                { key: "copiedShares", label: "복사", align: "right" },
                { key: "nativeShares", label: "공유", align: "right" },
              ]}
              rows={data.topSharedBlogPosts}
              keyField="slug"
              emptyMessage="블로그 공유 데이터가 없습니다"
            />
          </section>
        </>
      )}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof MousePointerClick;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <Icon className="h-4 w-4 text-[var(--color-primary)]" />
          {title}
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>
      </div>
      {title.includes("페이지") && (
        <PhoneCall className="mt-0.5 h-4 w-4 text-[var(--color-gold-dark)]" />
      )}
    </div>
  );
}
