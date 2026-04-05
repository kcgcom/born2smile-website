// =============================================================
// 블로그 메타데이터 인덱스 (본문 미포함 — 클라이언트 번들 최적화)
// =============================================================

export type {
  BlogPost,
  BlogPostMeta,
  BlogBlock,
  BlogRelatedLinkItem,
  BlogCategory,
  BlogCategoryFilter,
  BlogCategoryLabel,
  BlogCategorySlug,
  BlogCategoryValue,
  BlogTag,
} from "./types";
export {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS_LIST,
  BLOG_CATEGORY_SLUGS,
  BLOG_TAGS,
} from "./types";
export { categoryColors } from "./category-colors";
export {
  ALL_CATEGORY_SLUGS,
  BLOG_CATEGORY_LABELS,
  CATEGORY_LABEL_TO_SLUG,
  getCategoryLabel,
  getCategoryFromLabel,
  getCategorySlug,
  getCategoryFromSlug,
  getBlogPostUrl,
  isBlogCategorySlug,
  normalizeBlogCategory,
} from "./category-slugs";

import type { BlogCategorySlug, BlogCategoryValue } from "./types";
import { getCategorySlug } from "./category-slugs";

// 빌드 시 자동 생성된 메타데이터 (pnpm generate-blog-meta)
export { BLOG_POSTS_META } from "./generated/posts-meta";

// =============================================================
// 진료 과목 ↔ 블로그 카테고리 매핑
// =============================================================

export const TREATMENT_CATEGORY_MAP: Record<string, BlogCategorySlug> = {
  implant: "implant",
  orthodontics: "orthodontics",
  prosthetics: "prosthetics",
  pediatric: "pediatric",
  restorative: "restorative",
  scaling: "prevention",
};

const CATEGORY_TREATMENT_MAP: Partial<Record<BlogCategorySlug, string>> = Object.fromEntries(
  Object.entries(TREATMENT_CATEGORY_MAP).map(([k, v]) => [v, k])
);

/** 블로그 카테고리로 매핑되는 진료 과목 ID 조회 (없으면 null) */
export function getRelatedTreatmentId(category: BlogCategoryValue): string | null {
  return CATEGORY_TREATMENT_MAP[getCategorySlug(category)] ?? null;
}
