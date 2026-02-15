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

import type { BlogPost, BlogPostMeta, BlogCategoryValue } from "./types";

// 빌드 시 자동 생성된 메타데이터 (pnpm generate-blog-meta)
export { BLOG_POSTS_META } from "./generated/posts-meta";
import { BLOG_POSTS_META } from "./generated/posts-meta";

// =============================================================
// 진료 과목 ↔ 블로그 카테고리 매핑
// =============================================================

const TREATMENT_CATEGORY_MAP: Record<string, BlogCategoryValue> = {
  implant: "임플란트",
  orthodontics: "치아교정",
  prosthetics: "보철치료",
  pediatric: "소아치료",
  restorative: "보존치료",
  scaling: "예방·구강관리",
};

const CATEGORY_TREATMENT_MAP: Partial<Record<BlogCategoryValue, string>> = Object.fromEntries(
  Object.entries(TREATMENT_CATEGORY_MAP).map(([k, v]) => [v, k])
);

/** 진료 과목 ID로 해당 블로그 카테고리의 포스트 목록 조회 (미발행 제외) */
export function getRelatedBlogPosts(treatmentId: string, limit = 4): BlogPostMeta[] {
  const category = TREATMENT_CATEGORY_MAP[treatmentId];
  if (!category) return [];
  const today = new Date().toISOString().slice(0, 10);
  return BLOG_POSTS_META
    .filter((p) => p.category === category && p.date <= today)
    .slice(0, limit);
}

/** 블로그 카테고리로 매핑되는 진료 과목 ID 조회 (없으면 null) */
export function getRelatedTreatmentId(category: BlogCategoryValue): string | null {
  return CATEGORY_TREATMENT_MAP[category] ?? null;
}

/** slug로 포스트 전체 데이터 로드 (서버 전용 — 동적 import) */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  try {
    const mod = await import(`./posts/${slug}`);
    return (mod.post as BlogPost) ?? null;
  } catch {
    return null;
  }
}
