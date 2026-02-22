// =============================================================
// 카테고리 ↔ URL 슬러그 매핑
// =============================================================

import type { BlogCategoryValue } from "./types";

/** 한국어 카테고리 → URL 슬러그 */
export const CATEGORY_SLUG_MAP: Record<BlogCategoryValue, string> = {
  "임플란트": "implant",
  "치아교정": "orthodontics",
  "보철치료": "prosthetics",
  "보존치료": "restorative",
  "소아치료": "pediatric",
  "예방관리": "prevention",
  "건강상식": "health-tips",
};

/** URL 슬러그 → 한국어 카테고리 */
export const SLUG_CATEGORY_MAP = Object.fromEntries(
  Object.entries(CATEGORY_SLUG_MAP).map(([k, v]) => [v, k]),
) as Record<string, BlogCategoryValue>;

/** 한국어 카테고리에서 URL 슬러그를 반환 */
export function getCategorySlug(category: BlogCategoryValue): string {
  return CATEGORY_SLUG_MAP[category];
}

/** URL 슬러그에서 한국어 카테고리를 반환 (없으면 null) */
export function getCategoryFromSlug(slug: string): BlogCategoryValue | null {
  return SLUG_CATEGORY_MAP[slug] ?? null;
}

/** 블로그 포스트의 전체 URL 경로를 생성 */
export function getBlogPostUrl(slug: string, category: BlogCategoryValue): string {
  return `/blog/${getCategorySlug(category)}/${slug}`;
}

/** 모든 카테고리 URL 슬러그 배열 */
export const ALL_CATEGORY_SLUGS = Object.values(CATEGORY_SLUG_MAP);
