// =============================================================
// 블로그 메타데이터 인덱스 (본문 미포함 — 클라이언트 번들 최적화)
// =============================================================

export type {
  BlogPost,
  BlogPostMeta,
  BlogPostSection,
  BlogCategory,
  BlogCategoryValue,
  BlogTag,
} from "./types";
export { BLOG_CATEGORIES, BLOG_TAGS } from "./types";
export { categoryColors } from "./category-colors";

import type { BlogCategoryValue } from "./types";

// 빌드 시 자동 생성된 메타데이터 (pnpm generate-blog-meta)
export { BLOG_POSTS_META } from "./generated/posts-meta";

// =============================================================
// 진료 과목 ↔ 블로그 카테고리 매핑
// =============================================================

export const TREATMENT_CATEGORY_MAP: Record<string, BlogCategoryValue> = {
  implant: "임플란트",
  orthodontics: "치아교정",
  prosthetics: "보철치료",
  pediatric: "소아치료",
  restorative: "보존치료",
  scaling: "예방관리",
};

const CATEGORY_TREATMENT_MAP: Partial<Record<BlogCategoryValue, string>> = Object.fromEntries(
  Object.entries(TREATMENT_CATEGORY_MAP).map(([k, v]) => [v, k])
);

/** 블로그 카테고리로 매핑되는 진료 과목 ID 조회 (없으면 null) */
export function getRelatedTreatmentId(category: BlogCategoryValue): string | null {
  return CATEGORY_TREATMENT_MAP[category] ?? null;
}
