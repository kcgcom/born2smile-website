// -------------------------------------------------------------
// Shared types, constants, and utilities for Blog sub-tabs
// -------------------------------------------------------------

import type { BlogCategorySlug } from "@/lib/blog";

export interface AdminBlogPost {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: BlogCategorySlug;
  tags: string[];
  date: string;
  dateModified?: string;
  readTime: string;
  published: boolean;
  createdAt?: string;
}

export interface BlogFeedbackData {
  feedback: Record<string, { solved: number; unresolved: number; total: number }>;
  totalResponses: number;
}

export type SortKey = "newest" | "oldest" | "unresolved" | "recommended";
export type StatusFilter = "all" | "published" | "scheduled" | "draft";

// ---------------------------------------------------------------
// Category hex colors for Recharts (maps from Tailwind class names)
// ---------------------------------------------------------------

export const CATEGORY_HEX: Record<string, string> = {
  "예방관리": "#1D4ED8",
  "보존치료": "#15803D",
  "보철치료": "#7E22CE",
  "임플란트": "#BE123C",
  "치아교정": "#A67B1E",
  "소아치료": "#C2410C",
  "건강상식": "#0F766E",
};

// ---------------------------------------------------------------------------
// 초안 발행 추천순 계산
// ---------------------------------------------------------------------------

export function calcDraftRecommendationOrder(
  drafts: AdminBlogPost[],
  allPosts: AdminBlogPost[],
  today: string,
): AdminBlogPost[] {
  // 카테고리별 가장 최근 발행일 계산
  const lastPublishedByCategory: Record<string, string> = {};
  for (const p of allPosts) {
    if (p.published && p.date <= today) {
      const prev = lastPublishedByCategory[p.category];
      if (!prev || p.date > prev) {
        lastPublishedByCategory[p.category] = p.date;
      }
    }
  }

  const todayMs = new Date(today).getTime();
  const DAY_MS = 86400000;

  return [...drafts].sort((a, b) => {
    // 카테고리 점수: 마지막 발행일로부터의 일수 (미발행 카테고리 = 9999)
    const lastA = lastPublishedByCategory[a.category];
    const lastB = lastPublishedByCategory[b.category];
    const scoreA = lastA ? Math.floor((todayMs - new Date(lastA).getTime()) / DAY_MS) : 9999;
    const scoreB = lastB ? Math.floor((todayMs - new Date(lastB).getTime()) / DAY_MS) : 9999;

    if (scoreA !== scoreB) return scoreB - scoreA; // 높은 점수 우선

    // 동점: 먼저 작성한 초안 우선 (FIFO)
    const createdA = a.createdAt ?? "";
    const createdB = b.createdAt ?? "";
    return createdA.localeCompare(createdB);
  });
}
