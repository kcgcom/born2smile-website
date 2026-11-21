"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BlogCardReport } from "@/lib/admin-blog-cards";
import { useAdminApi } from "../useAdminApi";
import type { AdminBlogPost } from "../blog/blog-helpers";
import type { AnalyticsData, BlogGA4Data, ConversionData, Period, TopPageDetail, SourceDetail } from "./types";

export function useTrafficData(period: Period, blogView: boolean, blogPageDetail: boolean) {
  // 점진적 로딩: basic(Stage 1)을 먼저 표시, full이 오면 상세 데이터 병합
  const { data: basicData, loading: basicLoading, error: basicError, isValidating: basicValidating, updatedAt: basicUpdatedAt, refetch: refetchBasic } = useAdminApi<AnalyticsData>(
    `/api/admin/analytics?period=${period}&scope=basic`,
  );
  const { data: fullData, error: fullError, isValidating: fullValidating, updatedAt: fullUpdatedAt, refetch: refetchFull } = useAdminApi<AnalyticsData>(
    `/api/admin/analytics?period=${period}`,
    Boolean(basicData || basicError),
  );
  const data = fullData && (!basicData || fullData.dataAsOf >= basicData.dataAsOf) ? fullData : basicData;
  const loading = basicLoading && !data;
  const error = fullError ?? (fullData ? null : basicError);
  const refetch = useCallback(() => { refetchBasic(); refetchFull(); }, [refetchBasic, refetchFull]);
  const [backgroundBlogPeriod, setBackgroundBlogPeriod] = useState<Period | null>(null);
  const canPrefetch = Boolean(data && !error);
  useEffect(() => {
    if (!canPrefetch || backgroundBlogPeriod === period) return;
    // Give the overview a frame to paint before starting the background request.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setBackgroundBlogPeriod(period));
    });
    return () => cancelAnimationFrame(frame);
  }, [canPrefetch, period, backgroundBlogPeriod]);
  const loadBlogReports = blogView || (canPrefetch && backgroundBlogPeriod === period);
  const {
    data: blogGa4Data,
    loading: blogGa4Loading,
    error: blogGa4Error,
  } = useAdminApi<BlogGA4Data>(
    `/api/admin/blog-analytics?period=${period}`,
    loadBlogReports || blogPageDetail,
  );
  const blogCardReport = useAdminApi<BlogCardReport>(
    `/api/admin/posthog/blog-cards?period=${period}`,
    loadBlogReports,
  );
  const { data: conversionData, loading: conversionLoading } = useAdminApi<ConversionData>(
    `/api/admin/posthog/conversion?period=${period}`,
    blogView,
  );
  const { data: blogPostsData } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");

  const sourceDetails = useMemo(
    () => data?.sourceDetails ?? ({} as Record<string, SourceDetail>),
    [data?.sourceDetails],
  );
  const topPageDetails = useMemo(
    () => data?.topPageDetails ?? ({} as Record<string, TopPageDetail>),
    [data?.topPageDetails],
  );
  const blogAggregateDetail = data?.topPageDetails["/blog (전체)"] ?? null;

  const blogTitleMap = useMemo(() => {
    return new Map((blogPostsData ?? []).map((post) => [post.slug, post.title]));
  }, [blogPostsData]);

  const blogSummary = useMemo(() => {
    const rows = blogGa4Data?.blogPostStats ?? [];
    const fallbackPageViews = blogAggregateDetail?.summary.views ?? 0;

    if (rows.length === 0) {
      return { pageViews: fallbackPageViews, avgDuration: 0, trackedPosts: 0 };
    }

    const pageViews = rows.reduce((sum, row) => sum + row.pageViews, 0);
    const weightedDuration = rows.reduce((sum, row) => sum + row.avgDuration * row.pageViews, 0);

    return {
      pageViews: pageViews || fallbackPageViews,
      avgDuration: pageViews > 0 ? Math.round(weightedDuration / pageViews) : 0,
      trackedPosts: rows.length,
    };
  }, [blogAggregateDetail?.summary.views, blogGa4Data]);

  const blogGa4Map = useMemo(() => {
    return new Map((blogGa4Data?.blogPostStats ?? []).map((item) => [item.path, item]));
  }, [blogGa4Data]);

  const activeBlogPosts = useMemo(
    () => (blogGa4Data?.blogPostStats ?? []).filter((item) => item.pageViews > 0).length,
    [blogGa4Data],
  );

  const blogSourceShare = useMemo(() => {
    return (blogAggregateDetail?.sources ?? []).slice(0, 6);
  }, [blogAggregateDetail?.sources]);

  return {
    // Core analytics
    data,
    loading,
    error,
    refetch,
    isValidating: basicValidating || fullValidating,
    updatedAt: data === fullData ? fullUpdatedAt : basicUpdatedAt,
    // Blog GA4
    blogGa4Data,
    blogGa4Loading,
    blogGa4Error,
    blogCardReport,
    // Conversion
    conversionData: conversionData?.period === period ? conversionData : null,
    conversionLoading: conversionLoading || Boolean(conversionData && conversionData.period !== period),
    // Lookups
    sourceDetails,
    topPageDetails,
    blogAggregateDetail,
    blogTitleMap,
    blogGa4Map,
    // Blog computed
    blogSummary,
    activeBlogPosts,
    blogSourceShare,
  };
}
