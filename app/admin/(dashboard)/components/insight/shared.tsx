import { categoryColors } from "@/lib/blog/category-colors";
import {
  getKeywordCategoryLabel,
  type KeywordCategorySlug,
  type SearchIntent,
} from "@/lib/admin-naver-datalab-keywords";
import type { BusinessValue, InsightActionType } from "@/lib/trend-insights";

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
  gapScore: number;
  monthlyVolume: number | null;
  volumeSource: "searchad" | "datalab-fallback";
  isEstimated: boolean;
  relatedKeywords?: Array<{ keyword: string; volume: number }>;
  directKeywords?: Array<{ keyword: string; volume: number }>;
  searchIntent?: SearchIntent;
}

export interface TopicSuggestionItem {
  rank: number;
  category: KeywordCategorySlug;
  slug: KeywordCategorySlug;
  suggestedTitle: string;
  reasoning: string;
  keywords: string[];
  trend: "rising" | "falling" | "stable";
  gapScore: number;
  priority: "high" | "medium" | "low";
}

export interface InsightActionItem {
  slug: KeywordCategorySlug;
  subGroup: string;
  actionType: InsightActionType;
  businessValue: BusinessValue;
  confidence: number;
  reason: string;
  targetPage: string;
}

export interface FaqSuggestionItem {
  slug: KeywordCategorySlug;
  subGroup: string;
  question: string;
  priority: number;
  keywords: string[];
  targetPage: string;
}

export interface PageUpdateOpportunityItem {
  slug: KeywordCategorySlug;
  subGroup: string;
  targetPage: string;
  pageUpdateScore: number;
  missingSections: string[];
  recommendedBlocks: string[];
}

export interface BlogBriefItem {
  slug: KeywordCategorySlug;
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
}

export interface OverviewData {
  mode: "volume" | "full";
  period: { start: string; end: string } | null;
  categories: unknown[];
  contentGap: ContentGapItem[];
  suggestions: TopicSuggestionItem[];
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
  "dental-choice": "bg-fuchsia-100 text-fuchsia-700",
};

// ---------------------------------------------------------------
// 공유 유틸리티
// ---------------------------------------------------------------

export function calcTotalVolume(item: Pick<ContentGapItem, "monthlyVolume" | "relatedKeywords">): number {
  return (item.monthlyVolume ?? 0) + (item.relatedKeywords ?? []).reduce((s, rk) => s + rk.volume, 0);
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

export function GapScoreBadge({ score }: { score: number }) {
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
  navigational:  { label: "탐색형", className: "bg-gray-100 text-gray-600" },
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

export function BusinessValueBadge({ value }: { value: BusinessValue }) {
  if (value === "high") {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">고가치</span>;
  }
  if (value === "medium") {
    return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">중간</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">탐색형</span>;
}
