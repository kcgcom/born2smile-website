import { categoryColors } from "@/lib/blog/category-colors";
import type { BlogCategorySlug } from "@/lib/blog/types";
import {
  getKeywordCategoryLabel,
  type KeywordCategorySlug,
  type SearchIntent,
} from "@/lib/admin-naver-datalab-keywords";
import type { InsightAction } from "@/lib/trend-insights";
import type { OpportunityEvaluation } from "@/lib/opportunity-scoring";
import type { CategoryTrendData } from "@/lib/trend-analysis";
import type { CategoryKeywords } from "@/lib/admin-naver-datalab-keywords";

// ---------------------------------------------------------------
// 공유 타입 (insight 서브탭 간 공유)
// ---------------------------------------------------------------

export interface MetricValue {
  value: number;
  change: number | null;
}

export interface ContentGapItem {
  category: KeywordCategorySlug;
  slug: KeywordCategorySlug;
  subGroup: string;
  keywords: string[];
  trend: "rising" | "falling" | "stable";
  changeRate: number;
  currentAvg: number;
  existingPostCount: number;
  contentGapScore: number;
  contentCoverage: number;
  coverageEvidence: Array<{ slug: string; title: string; strength: number }>;
  monthlyVolume: number | null;
  volumeSource: "searchad" | "datalab-fallback";
  isEstimated: boolean;
  relatedKeywords?: Array<{ keyword: string; volume: number }>;
  directKeywords?: Array<{ keyword: string; volume: number }>;
  searchIntent?: SearchIntent;
}

export interface InsightActionItem {
  slug: KeywordCategorySlug;
  subGroup: string;
  actionType: InsightAction["actionType"];
  valueScore: number;
  confidence: "B" | "C";
  reason: string;
  targetPage: string;
}

export interface FaqSuggestionItem {
  slug: KeywordCategorySlug;
  subGroup: string;
  question: string;
  valueScore: number;
  keywords: string[];
  targetPage: string;
}

export interface PageUpdateOpportunityItem {
  slug: KeywordCategorySlug;
  subGroup: string;
  targetPage: string;
  pageValueScore: number;
  missingSections: string[];
  recommendedBlocks: string[];
  contributingTopics: Array<{
    topicKey: string;
    subGroup: string;
    valueScore: number;
    status: "promote-from-faq" | "missing";
    missingSections: string[];
  }>;
  confirmationTopics: Array<{ topicKey: string; subGroup: string }>;
}

export interface BlogBriefItem {
  slug: KeywordCategorySlug;
  contentCategory: BlogCategorySlug;
  subGroup: string;
  suggestedTitle: string;
  targetKeyword: string;
  searchIntent: string;
  targetReader: string;
  outline: string[];
  cta: string;
  metaDescription: string;
  targetPage: string;
}

export interface PageBriefItem {
  slug: KeywordCategorySlug;
  subGroup: string;
  targetPage: string;
  heroCopy: string;
  supportingCopy: string;
  blocks: string[];
  faqQuestions: string[];
  cta: string;
  sourceFiles: string[];
  checklist: string[];
  contributingTopics: PageUpdateOpportunityItem["contributingTopics"];
  confirmationTopics: PageUpdateOpportunityItem["confirmationTopics"];
}

export interface TrendOverviewCategory {
  category: KeywordCategorySlug;
  slug: KeywordCategorySlug;
  overallTrend?: "rising" | "falling" | "stable" | null;
  changeRate?: number | null;
  topSubGroup?: string | null;
  subGroupCount?: number | null;
  risingCount?: number | null;
  fallingCount?: number | null;
  stableCount?: number | null;
  monthlyTotalVolume?: number | null;
  subGroupVolumes?: Record<string, number> | null;
  error: string | null;
}

export interface TrendSummaryData {
  mode: "volume" | "trend";
  period: { start: string; end: string } | null;
  categories: TrendOverviewCategory[];
  contentGap: ContentGapItem[];
  /** 6개월 일별 시계열 (1m/3m 기간 선택용) */
  shortTermDetail?: CategoryTrendData[];
  /** 3년 주별 시계열 (1y/3y 기간 선택용) */
  longTermDetail?: CategoryTrendData[];
  volumeSource: "searchad" | "datalab-fallback";
  volumeCoverage: number | null;
  keywordTaxonomy: CategoryKeywords[];
  taxonomyMeta: { version: number | null; source: "supabase" | "code-fallback"; createdAt: string | null };
}

export interface StrategyOverviewData {
  mode: "strategy";
  period: { start: string; end: string } | null;
  meta: {
    fetchedAt: string;
    taxonomyVersion?: number | null;
    taxonomySource?: "supabase" | "code-fallback";
    scoringModelVersion: string;
  };
  contentGap: ContentGapItem[];
  opportunityEvaluations: OpportunityEvaluation[];
  insightActions: InsightActionItem[];
  faqSuggestions: FaqSuggestionItem[];
  pageOpportunities: PageUpdateOpportunityItem[];
  blogBriefs: BlogBriefItem[];
  pageBriefs: PageBriefItem[];
  volumeSource: "searchad" | "datalab-fallback";
  volumeCoverage: number | null;
}

const KEYWORD_CATEGORY_BADGE_COLORS: Record<KeywordCategorySlug, string> = {
  ...categoryColors,
  "general-care": "bg-amber-100 text-amber-800",
  "dental-choice": "bg-fuchsia-100 text-fuchsia-700",
};

// ---------------------------------------------------------------
// 공유 유틸리티
// ---------------------------------------------------------------

export function calcRelatedVolume(item: Pick<ContentGapItem, "relatedKeywords">, limit?: number): number {
  const keywords = limit == null ? (item.relatedKeywords ?? []) : (item.relatedKeywords ?? []).slice(0, limit);
  return keywords.reduce((sum, keyword) => sum + keyword.volume, 0);
}

// ---------------------------------------------------------------
// 공유 포맷 유틸리티
// ---------------------------------------------------------------

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------
// 공유 뱃지 컴포넌트
// ---------------------------------------------------------------

export function CategoryBadge({ category }: { category: KeywordCategorySlug }) {
  const colorClass =
    KEYWORD_CATEGORY_BADGE_COLORS[category] ?? "bg-[var(--background)] text-[var(--muted)]";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {getKeywordCategoryLabel(category)}
    </span>
  );
}

export function ValueScoreBadge({ score }: { score: number }) {
  if (score >= 70) {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">HIGH</span>;
  }
  if (score >= 40) {
    return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">MED</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">LOW</span>;
}

const SEARCH_INTENT_STYLES: Record<SearchIntent, { label: string; className: string }> = {
  informational: { label: "정보형", className: "bg-blue-100 text-blue-700" },
  commercial:    { label: "비교/검토", className: "bg-orange-100 text-orange-700" },
  transactional: { label: "전환형", className: "bg-green-100 text-green-700" },
  navigational:  { label: "탐색형", className: "bg-[var(--background)] text-[var(--muted)]" },
};

export function SearchIntentBadge({ intent }: { intent: SearchIntent }) {
  const { label, className } = SEARCH_INTENT_STYLES[intent];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${className}`}>
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  if (priority === "high") {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">HIGH</span>;
  }
  if (priority === "medium") {
    return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">MED</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">LOW</span>;
}
