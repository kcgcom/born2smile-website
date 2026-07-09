"use client";

import { useState } from "react";
import { MetricCard } from "./MetricCard";
import { PeriodSelector } from "./PeriodSelector";
import { AdminErrorState } from "./AdminErrorState";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { ApiSourceBadge } from "./insight/ApiSourceBadge";
import { formatDuration } from "./insight/shared";
import {
  TopPagesChart,
  TrafficSourceChart,
  DeviceChart,
  DailyTrendChart,
  CityChart,
  NewVsReturningChart,
  HourlyPatternChart,
  DowPatternChart,
} from "./traffic/charts";
import { SectionCard } from "./traffic/SectionCard";
import { useTrafficData } from "./traffic/useTrafficData";
import { TrafficBlogView } from "./traffic/TrafficBlogView";
import { SourceDetailModal } from "./traffic/SourceDetailModal";
import { TopPageDetailModal } from "./traffic/TopPageDetailModal";
import { PERIODS, TRAFFIC_VIEWS, getTopPageDisplayTitle } from "./traffic/types";
import type { Period, TrafficView } from "./traffic/types";

export function TrafficTab() {
  const [period, setPeriod] = useState<Period>("30d");
  const [view, setView] = useState<TrafficView>("overall");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTopPage, setSelectedTopPage] = useState<string | null>(null);

  const td = useTrafficData(period);

  const activeSource = selectedSource && td.sourceDetails[selectedSource]
    ? selectedSource
    : null;
  const activeSourceDetail = activeSource ? td.sourceDetails[activeSource] : null;
  const activeTopPage = selectedTopPage && td.topPageDetails[selectedTopPage]
    ? selectedTopPage
    : null;
  const activeTopPageDetail = activeTopPage ? td.topPageDetails[activeTopPage] : null;
  const activeTopPageDuration = activeTopPage ? td.blogGa4Map.get(activeTopPage)?.avgDuration ?? 0 : 0;
  const activeTopPageTitle = activeTopPage
    ? getTopPageDisplayTitle(activeTopPage, td.blogTitleMap)
    : "";

  return (
    <div className="space-y-6">
      <ApiSourceBadge
        sources={["ga4"]}
        urlOverrides={td.data?.analyticsUrl ? { ga4: td.data.analyticsUrl } : undefined}
      />

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector
          periods={PERIODS}
          selected={period}
          onChange={(v) => {
            setPeriod(v as Period);
            setSelectedSource(null);
            setSelectedTopPage(null);
          }}
        />
        {td.data?.period && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            집계 기간: {td.data.period.start} ~ {td.data.period.end}
          </span>
        )}
        {td.data?.dataAsOf && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            <span aria-hidden="true">ⓘ</span> 데이터 기준: {td.data.dataAsOf} (어제 기준)
          </span>
        )}
        <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
          탭별 데이터 지연 기준이 달라 검색 성과 탭과 날짜 범위가 완전히 같지 않을 수 있습니다.
        </span>
      </div>

      <div role="tablist" className="flex w-fit gap-1 rounded-xl bg-[var(--background)]/80 p-1">
        {TRAFFIC_VIEWS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={view === item.value}
            onClick={() => {
              setView(item.value);
              setSelectedSource(null);
              setSelectedTopPage(null);
            }}
            className={`rounded-lg px-4 py-1.5 text-sm transition-all ${
              view === item.value
                ? "bg-[var(--surface)] font-semibold text-[var(--color-primary)] shadow-sm"
                : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {td.loading && <AdminLoadingSkeleton variant="full" />}

      {/* Error */}
      {!td.loading && td.error && (
        <AdminErrorState message={td.error} onRetry={td.refetch} />
      )}

      {/* Data */}
      {!td.loading && !td.error && td.data && (
        <>
          {view === "overall" ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <MetricCard
                  label="세션"
                  value={td.data.summary.sessions.value.toLocaleString("ko-KR")}
                  change={td.data.summary.sessions.change}
                />
                <MetricCard
                  label="사용자"
                  value={td.data.summary.users.value.toLocaleString("ko-KR")}
                  change={td.data.summary.users.change}
                />
                <MetricCard
                  label="페이지뷰"
                  value={td.data.summary.pageviews.value.toLocaleString("ko-KR")}
                  change={td.data.summary.pageviews.change}
                />
                <MetricCard
                  label="평균 체류"
                  value={formatDuration(td.data.summary.avgDuration.value)}
                  change={td.data.summary.avgDuration.change}
                />
                <MetricCard
                  label="이탈률"
                  value={`${td.data.summary.bounceRate.value.toFixed(1)}%`}
                  change={td.data.summary.bounceRate.change}
                  invertChange={true}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard title="주요 페이지·섹션">
                  <TopPagesChart
                    data={td.data.topPages}
                    selectedPath={activeTopPage}
                    onSelect={setSelectedTopPage}
                  />
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    블로그, 치료 페이지, 리서치는 전체 섹션 단위로 먼저 묶은 뒤 비교합니다. 막대를 누르면 상세가 열립니다.
                  </p>
                </SectionCard>

                <SectionCard title="유입 경로">
                  <TrafficSourceChart
                    data={td.data.trafficSources}
                    selectedSource={activeSource}
                    onSelect={setSelectedSource}
                  />
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    파이차트의 해당 조각을 누르면 유입경로 상세가 열립니다.
                  </p>
                </SectionCard>

                <SectionCard title="기기별 접속">
                  <DeviceChart data={td.data.devices} />
                </SectionCard>

                <SectionCard title="일별 방문자 추이">
                  <DailyTrendChart data={td.data.dailyTrend} />
                </SectionCard>

                <SectionCard title="지역별 유입 TOP 10">
                  <CityChart data={td.data.cities} />
                </SectionCard>

                <SectionCard title="신규 vs 재방문">
                  <NewVsReturningChart data={td.data.newVsReturning} />
                </SectionCard>

                <SectionCard title="시간대별 방문 패턴">
                  <HourlyPatternChart data={td.data.hourlyPattern} />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    가장 많이 방문하는 시간대가 골드 색으로 표시됩니다.
                  </p>
                </SectionCard>

                <SectionCard title="요일별 방문 패턴">
                  <DowPatternChart data={td.data.dowPattern} />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    가장 많이 방문하는 요일이 골드 색으로 표시됩니다.
                  </p>
                </SectionCard>
              </div>
            </>
          ) : (
            <TrafficBlogView
              period={period}
              blogGa4Data={td.blogGa4Data}
              blogGa4Loading={td.blogGa4Loading}
              blogGa4Error={td.blogGa4Error}
              conversionData={td.conversionData}
              conversionLoading={td.conversionLoading}
              blogAggregateDetail={td.blogAggregateDetail}
              blogTitleMap={td.blogTitleMap}
              blogSummary={td.blogSummary}
              activeBlogPosts={td.activeBlogPosts}
              longestReadPosts={td.longestReadPosts}
              shortestReadPosts={td.shortestReadPosts}
              blogSourceShare={td.blogSourceShare}
              topPageDetails={td.topPageDetails}
              onSelectTopPage={setSelectedTopPage}
            />
          )}
        </>
      )}

      {view === "overall" && activeSource && activeSourceDetail && (
        <SourceDetailModal
          source={activeSource}
          detail={activeSourceDetail}
          onClose={() => setSelectedSource(null)}
        />
      )}

      {activeTopPage && activeTopPageDetail && (
        <TopPageDetailModal
          path={activeTopPage}
          title={activeTopPageTitle}
          detail={activeTopPageDetail}
          duration={activeTopPageDuration}
          avgDurationBaseline={td.blogSummary.avgDuration}
          onClose={() => setSelectedTopPage(null)}
          onSelectTopPage={setSelectedTopPage}
        />
      )}
    </div>
  );
}
