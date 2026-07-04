import type { BlogCategorySlug } from "@/lib/blog/types";
import type { MetricValue } from "../insight/shared";

export type KeywordChartItem = {
  query: string;
  impressions: number;
  clicks: number;
};

export interface SearchMetricRow {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface RewriteReasonBadge {
  label: string;
  className: string;
}

export interface QueryActionRecommendation {
  kind: "edit" | "new" | "review";
  label: string;
  description: string;
  slug?: string;
  category?: BlogCategorySlug | null;
  suggestedTitles?: string[];
}

export interface SearchConsoleData {
  siteUrl: string;
  configuredSiteUrl: string;
  dataAsOf: string;
  period: { start: string; end: string };
  comparePeriod: { start: string; end: string };
  summary: {
    impressions: MetricValue;
    clicks: MetricValue;
    ctr: MetricValue;
    position: MetricValue;
  };
  topQueries: Array<{
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  blogPages: Array<{
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  pageTopQueries: Record<
    string,
    Array<{
      query: string;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
    }>
  >;
  queryTopPages: Record<
    string,
    Array<{
      page: string;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
    }>
  >;
  blogQueryTopPages: Record<
    string,
    Array<{
      page: string;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
    }>
  >;
  /** Server-computed semantic clusters (null if Gemini not configured) */
  semanticClusters?: SemanticCluster[] | null;
  /** Blog query semantic clusters */
  blogSemanticClusters?: SemanticCluster[] | null;
}

export type SemanticCluster = {
  representative: string;
  keywords: Array<{
    query: string;
    similarity: number;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export type SearchPriorityRow =
  | SearchConsoleData["topPages"][number]
  | SearchConsoleData["topQueries"][number]
  | SearchConsoleData["blogPages"][number];

export type TableSortKey = keyof SearchMetricRow;
export type SortDirection = "asc" | "desc";

export interface PageQueryDrilldownProps {
  page: string;
  queries: SearchConsoleData["pageTopQueries"][string];
  onClose: () => void;
  onEditBlog?: () => void;
  metrics?: SearchMetricRow;
}

export interface QueryPageDrilldownProps {
  query: string;
  pages: SearchConsoleData["queryTopPages"][string];
  onClose: () => void;
  onEditBlog: (slug: string) => void;
  onCreatePost: (category?: string | null) => void;
}
