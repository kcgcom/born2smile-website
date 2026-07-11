"use client";

import { useCallback, useMemo } from "react";
import { useAdminApi } from "../useAdminApi";
import type { AdminBlogPost } from "../blog/blog-helpers";
import type { AnalyticsData, BlogGA4Data, ConversionData, Period, TopPageDetail, SourceDetail } from "./types";
import { toBlogAnalyticsPeriod } from "./types";

export function useTrafficData(period: Period) {
  // 점진적 로딩: basic(Stage 1)을 먼저 표시, full이 오면 상세 데이터 병합
  const { data: basicData, loading: basicLoading, error: basicError, refetch: refetchBasic } = useAdminApi<AnalyticsData>(
    `/api/admin/analytics?period=${period}&scope=basic`,
  );
  const { data: fullData, loading: fullLoading, error: fullError, refetch: refetchFull } = useAdminApi<AnalyticsData>(
    `/api/admin/analytics?period=${period}`,
  );
  const data = fullData ?? basicData;
  const loading = basicLoading;
  const error = fullError ?? basicError;
  const refetch = useCallback(() => { refetchBasic(); refetchFull(); }, [refetchBasic, refetchFull]);
  const {
    data: blogGa4Data,
    loading: blogGa4Loading,
    error: blogGa4Error,
  } = useAdminApi<BlogGA4Data>(
    `/api/admin/blog-analytics?period=${toBlogAnalyticsPeriod(period)}`,
  );
  const { data: conversionData, loading: conversionLoading } = useAdminApi<ConversionData>(
    `/api/admin/posthog/conversion?period=${period}`,
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

  const comparableBlogPosts = useMemo(() => {
    return (blogGa4Data?.blogPostStats ?? [])
      .filter((item) => item.pageViews >= 20 && item.avgDuration > 0);
  }, [blogGa4Data]);

  const longestReadPosts = useMemo(() => {
    return comparableBlogPosts
      .filter((item) => item.avgDuration > blogSummary.avgDuration)
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);
  }, [blogSummary.avgDuration, comparableBlogPosts]);

  const shortestReadPosts = useMemo(() => {
    return comparableBlogPosts
      .filter((item) => item.avgDuration < blogSummary.avgDuration)
      .sort((a, b) => a.avgDuration - b.avgDuration)
      .slice(0, 5);
  }, [blogSummary.avgDuration, comparableBlogPosts]);

  const blogSourceShare = useMemo(() => {
    return (blogAggregateDetail?.sources ?? []).slice(0, 6);
  }, [blogAggregateDetail?.sources]);

  return {
    // Core analytics
    data,
    loading,
    error,
    refetch,
    // Blog GA4
    blogGa4Data,
    blogGa4Loading,
    blogGa4Error,
    // Conversion
    conversionData,
    conversionLoading,
    // Lookups
    sourceDetails,
    topPageDetails,
    blogAggregateDetail,
    blogTitleMap,
    blogGa4Map,
    // Blog computed
    blogSummary,
    activeBlogPosts,
    longestReadPosts,
    shortestReadPosts,
    blogSourceShare,
  };
}
