import { categoryColors } from "@/lib/blog/category-colors";
import {
  getKeywordCategoryLabel,
  type KeywordCategorySlug,
} from "@/lib/admin-naver-datalab-keywords";

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

export interface OverviewData {
  mode: "volume" | "full";
  period: { start: string; end: string } | null;
  categories: unknown[];
  contentGap: ContentGapItem[];
  suggestions: TopicSuggestionItem[];
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

export function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  if (priority === "high") {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">HIGH</span>;
  }
  if (priority === "medium") {
    return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">MED</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">LOW</span>;
}
