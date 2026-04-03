"use client";

import { MousePointerClick, PhoneCall, Route, ScrollText } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../DataTable";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { MetricCard } from "../MetricCard";
import { PeriodSelector } from "../PeriodSelector";
import { ApiSourceBadge } from "./ApiSourceBadge";
import { useAdminApi } from "../useAdminApi";

interface ConversionData {
  configured: boolean;
  period: "7d" | "30d" | "90d";
  summary: {
    totalCtaClicks: number;
    totalPhoneClicks: number;
    totalContactClicks: number;
    contactPageViews: number;
    contactToPhoneRate: number | null;
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
}

const PERIODS = [
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
  { value: "90d", label: "90일" },
] as const;

export function ConversionSubTab() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const { data, loading, error, refetch } = useAdminApi<ConversionData>(
    `/api/admin/posthog/conversion?period=${period}`,
  );

  return (
    <div className="space-y-6">
      <ApiSourceBadge sources={["posthog"]} />

      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector
          periods={PERIODS.map((item) => ({ value: item.value, label: item.label }))}
          selected={period}
          onChange={(value) => setPeriod(value as "7d" | "30d" | "90d")}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="총 CTA 클릭"
              value={data.summary.totalCtaClicks.toLocaleString("ko-KR")}
              color="text-[var(--color-primary)]"
            />
            <MetricCard
              label="전화 클릭"
              value={data.summary.totalPhoneClicks.toLocaleString("ko-KR")}
              color="text-emerald-700"
            />
            <MetricCard
              label="상담 페이지뷰"
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
              color="text-slate-900"
            />
          </div>

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
