"use client";

import { ReportToolbar } from "../ReportToolbar";

import { formatShareYield, SHARE_YIELD_DESCRIPTION } from "../analytics-display";
import { Activity, MousePointerClick, PhoneCall, Route, ScrollText } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "../DataTable";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { MetricCard } from "../MetricCard";
import { PeriodSelector } from "../PeriodSelector";
import { ApiSourceBadge } from "./ApiSourceBadge";
import { forceRefetchAdminApi, useAdminApi } from "../useAdminApi";
import type { AdminBlogPost } from "../blog/blog-helpers";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { getSearchPageLabel } from "@/lib/search-page";

interface PostHogHealthSummary {
  events24h: number | null;
  ctaEvents24h: number | null;
  lastEventAt: string | null;
  healthy: boolean;
}

interface PostHogHealthData {
  env: {
    tokenConfigured: boolean;
    hostConfigured: boolean;
    projectIdConfigured: boolean;
    apiKeyConfigured: boolean;
  };
  summary: PostHogHealthSummary;
  links: Record<string, string | null>;
}

interface ConversionData {
  configured: boolean;
  period: "30d" | "90d" | "180d";
  warnings: string[];
  meta: {
    fetchedAt: string;
    partial: boolean;
    cacheTtlSeconds: number;
  };
  summary: {
    totalCtaClicks: number;
    totalPhoneClicks: number;
    totalContactClicks: number;
    totalNavigationClicks?: number;
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

const CTA_LOCATION_LABELS: Record<string, string> = {
  ...SHARE_SOURCE_LABELS,
  floating_cta: "고정 문의 버튼",
  contact_page: "상담 안내 페이지",
  blog_bottom: "블로그 하단",
  hero: "첫 화면",
  header_desktop: "PC 상단 문의",
  header_mobile: "모바일 상단 문의",
  mobile_menu_phone: "모바일 메뉴 전화",
  floating_mobile_nav: "모바일 고정 문의",
  floating_desktop_phone: "PC 고정 전화",
  cta_banner: "문의 안내 배너",
  contact_main: "상담 페이지 전화",
  contact_kakao: "상담 페이지 카카오",
  contact_bottom: "상담 페이지 하단",
  footer_phone: "하단 전화",
  footer_address: "하단 주소",
  footer_naver_map: "하단 네이버 지도",
  footer_kakao_map: "하단 카카오 지도",
  footer_google_review: "하단 Google 리뷰",
  footer_naver_review: "하단 네이버 리뷰",
  footer_kakao_channel: "하단 카카오 채널",
  footer_naver_map_icon: "하단 지도 아이콘",
};

export function ConversionSubTab() {
  const [period, setPeriod] = useState<"30d" | "90d" | "180d">("30d");
  const [retryingDetails, setRetryingDetails] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const endpoint = `/api/admin/posthog/conversion?period=${period}`;
  const { data, loading, isValidating, error, refetch } = useAdminApi<ConversionData>(
    endpoint,
  );
  const { data: healthData } = useAdminApi<PostHogHealthData>("/api/admin/posthog/health");
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
      <ReportToolbar>
        <ApiSourceBadge sources={["posthog"]} />

        <div className="flex flex-wrap items-center gap-3">
          <PeriodSelector
            periods={PERIODS.map((item) => ({ value: item.value, label: item.label }))}
            selected={period}
            disabled={isValidating || retryingDetails}
            onChange={(value) => {
              setRetryError(null);
              setPeriod(value as "30d" | "90d" | "180d");
            }}
          />
          {data && (
            <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
              ⓘ 현재 {PERIOD_LABELS[data.period]} 데이터 · {formatFetchedAt(data.meta.fetchedAt)} 조회
            </span>
          )}
          {isValidating && !loading && (
            <span className="text-xs font-medium text-[var(--color-primary)]">
              {data?.period !== period ? `${PERIOD_LABELS[period]} 데이터 불러오는 중…` : "최신 데이터 확인 중…"}
            </span>
          )}
        </div>
      </ReportToolbar>

      {data && data.warnings.length > 0 && (
        <AdminNotice tone="warning">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">일부 상세 데이터를 불러오지 못했습니다.</p>
              <ul className="mt-1 space-y-1 text-xs">{data.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul>
            </div>
            <button
              type="button"
              disabled={retryingDetails}
              onClick={async () => {
                setRetryingDetails(true);
                setRetryError(null);
                try {
                  await forceRefetchAdminApi<ConversionData>(endpoint);
                } catch (retryFailure) {
                  setRetryError(
                    retryFailure instanceof Error
                      ? retryFailure.message
                      : "상세 데이터를 다시 불러오지 못했습니다.",
                  );
                } finally {
                  setRetryingDetails(false);
                }
              }}
              className="rounded-xl border border-amber-300 bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white disabled:opacity-50"
            >
              {retryingDetails ? "다시 불러오는 중…" : "상세 데이터 다시 시도"}
            </button>
          </div>
        </AdminNotice>
      )}

      {retryError && (
        <AdminNotice tone="error">
          <div>
            <p className="font-semibold">상세 데이터 재시도에 실패했습니다.</p>
            <p className="mt-1 text-xs">{retryError}</p>
          </div>
        </AdminNotice>
      )}

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
              label={`${PERIOD_LABELS[data.period]} 카카오 클릭`}
              value={(data.summary.totalContactClicks ?? 0).toLocaleString("ko-KR")}
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
              label="문의 안내 이동"
              value={(data.summary.totalNavigationClicks ?? 0).toLocaleString("ko-KR")}
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

      {!loading && !error && data?.configured && healthData && (
        <details open={!healthData.summary.healthy} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 py-2">
            <Activity className="h-4 w-4 text-[var(--color-primary)]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">계측 상태 · 상세</span>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${healthData.summary.healthy ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {healthData.summary.healthy ? "정상" : "이벤트 없음"}
            </span>
          </summary>
          <div className="grid grid-cols-3 gap-3 pb-4">
            <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
              <div className="text-xs text-[var(--muted)]">24시간 이벤트</div>
              <div className="mt-0.5 text-base font-semibold text-[var(--foreground)]">{healthData.summary.events24h?.toLocaleString("ko-KR") ?? "—"}</div>
            </div>
            <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
              <div className="text-xs text-[var(--muted)]">24시간 CTA</div>
              <div className="mt-0.5 text-base font-semibold text-[var(--foreground)]">{healthData.summary.ctaEvents24h?.toLocaleString("ko-KR") ?? "—"}</div>
            </div>
            <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
              <div className="text-xs text-[var(--muted)]">마지막 이벤트</div>
              <div className="mt-0.5 text-base font-semibold text-[var(--foreground)]">{healthData.summary.lastEventAt ? formatCompactDate(healthData.summary.lastEventAt) : "—"}</div>
            </div>
          </div>
        </details>
      )}


          <section>
            <details className="mb-2 text-sm text-slate-700"><summary className="min-h-11 cursor-pointer py-3">공유 지표 정의</summary><p className="pb-3">{SHARE_YIELD_DESCRIPTION}</p></details>
            <SectionTitle
              icon={Route}
              title="블로그 공유 성과"
              subtitle={`${PERIOD_LABELS[data.period]} 기준 공유 시도와 실제 공유 유입을 함께 확인합니다`}
            />
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="공유 1회당 유입"
                value={
                  formatShareYield(data.summary.totalShareVisits, data.summary.totalShareActions)
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
            </div>
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-2" aria-label="문의·공유 상세 성과">
            <section>
              <SectionTitle
                icon={MousePointerClick}
                title="공유 버튼 위치별 성과"
                subtitle="어느 위치의 공유 버튼이 실제로 사용되는지 확인합니다"
              />
              <DataTable mobileCards
                columns={[
                  {
                    key: "shareSource",
                    className: "md:w-2/5",
                    label: "공유 위치",
                    align: "left",
                    render: (row) => SHARE_SOURCE_LABELS[row.shareSource] ?? row.shareSource,
                  },
                  { key: "shareActions", label: "공유 시도", align: "right" },
                  { key: "shareVisits", label: "공유 유입", align: "right" },
                  {
                    key: "visitRate",
                    label: "공유 1회당 유입",
                    align: "right",
                    render: (row) => formatShareYield(row.shareVisits, row.shareActions),
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
                subtitle="문의 버튼이 표시된 위치별 클릭 분포"
              />
              <DataTable mobileCards
                columns={[
                  { key: "ctaLocation", label: "위치", align: "left", className: "md:w-2/5", render: row => CTA_LOCATION_LABELS[row.ctaLocation] ?? "기타 위치" },
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
              <DataTable mobileCards
                columns={[
                  { key: "pagePath", label: "페이지", align: "left", className: "md:w-2/5", render: row => {
                    const slug = row.pagePath.split("/").filter(Boolean).at(-1);
                    return <div><p>{slugToTitleMap.get(slug ?? "") ?? getSearchPageLabel(row.pagePath)}</p><p className="mt-1 break-all text-xs font-normal text-slate-600">{row.pagePath}</p></div>;
                  } },
                  { key: "totalClicks", label: "총 클릭", align: "right" },
                  { key: "phoneClicks", label: "전화", align: "right" },
                  { key: "contactClicks", label: "카카오", align: "right" },
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
              <DataTable mobileCards
                columns={[
                  { key: "slug", label: "글 제목", align: "left", className: "md:w-2/5", render: row => slugToTitleMap.get(row.slug) ?? row.slug },
                  { key: "totalClicks", label: "총 클릭", align: "right" },
                  { key: "phoneClicks", label: "전화", align: "right" },
                  { key: "contactClicks", label: "카카오", align: "right" },
                ]}
                rows={data.topBlogPosts}
                keyField="slug"
                emptyMessage="블로그 CTA 클릭 데이터가 없습니다"
              />
            </section>

            <section className="lg:col-span-2">
              <SectionTitle
                icon={ScrollText}
                title="공유된 블로그 TOP"
                subtitle="어떤 글이 가장 많이 공유되고 실제 유입까지 이어졌는지 확인합니다"
              />
              <DataTable mobileCards
                columns={[
                  {
                    key: "slug",
                    className: "md:w-2/5",
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
                    label: "공유 1회당 유입",
                    align: "right",
                    render: (row) => formatShareYield(row.shareVisits, row.shareActions),
                  },
                  { key: "copiedShares", label: "복사", align: "right" },
                  { key: "nativeShares", label: "공유", align: "right" },
                ]}
                rows={data.topSharedBlogPosts}
                keyField="slug"
                emptyMessage="블로그 공유 데이터가 없습니다"
              />
            </section>
          </div>
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

function formatCompactDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFetchedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
