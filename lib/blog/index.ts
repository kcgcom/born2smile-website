// =============================================================
// 블로그 메타데이터 인덱스 (본문 미포함 — 클라이언트 번들 최적화)
// Notion이 설정되면 Notion DB에서 조회, 아니면 기존 .ts 파일 기반
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
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { isNotionConfigured } from "../notion";

// 빌드 시 자동 생성된 메타데이터 (pnpm generate-blog-meta)
// Notion 미설정 시 fallback으로 사용
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

/** 진료 과목 ID로 해당 블로그 카테고리의 포스트 목록 조회 */
export function getRelatedBlogPosts(treatmentId: string, limit = 4): BlogPostMeta[] {
  const category = TREATMENT_CATEGORY_MAP[treatmentId];
  if (!category) return [];
  return BLOG_POSTS_META.filter((p) => p.category === category).slice(0, limit);
}

/** 블로그 카테고리로 매핑되는 진료 과목 ID 조회 (없으면 null) */
export function getRelatedTreatmentId(category: BlogCategoryValue): string | null {
  return CATEGORY_TREATMENT_MAP[category] ?? null;
}

// =============================================================
// 데이터 조회 (Notion ↔ 파일 자동 분기)
// =============================================================

/** 모든 포스트 메타데이터 조회 (목록 페이지용) */
export async function getAllPostsMeta(): Promise<BlogPostMeta[]> {
  if (isNotionConfigured()) {
    const { getAllPostsMetaFromNotion } = await import("../notion/blog");
    return getAllPostsMetaFromNotion();
  }
  return BLOG_POSTS_META;
}

/** 모든 포스트 slug 조회 (generateStaticParams용) */
export async function getPostSlugs(): Promise<string[]> {
  if (isNotionConfigured()) {
    const { getPostSlugsFromNotion } = await import("../notion/blog");
    return getPostSlugsFromNotion();
  }
  return BLOG_POSTS_META.map((p) => p.slug);
}

/**
 * slug로 포스트 데이터 조회 (상세 페이지용)
 *
 * Notion 설정 시: { meta, blocks, content: null }
 * 파일 기반 시:   { meta, blocks: null, content }
 */
export async function getPostData(slug: string): Promise<{
  meta: BlogPostMeta;
  blocks: BlockObjectResponse[] | null;
  content: BlogPost["content"] | null;
} | null> {
  if (isNotionConfigured()) {
    const { getPostFromNotion } = await import("../notion/blog");
    const result = await getPostFromNotion(slug);
    if (!result) return null;
    return { meta: result.meta, blocks: result.blocks, content: null };
  }

  const post = await getPostBySlugFromFile(slug);
  if (!post) return null;
  const { content, ...meta } = post;
  return { meta, blocks: null, content };
}

/** slug로 포스트 전체 데이터 로드 — 파일 기반 (기존 호환용) */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (isNotionConfigured()) {
    // Notion 모드에서도 BlogPost 형태로 반환 (content는 빈 배열)
    const { getPostFromNotion } = await import("../notion/blog");
    const result = await getPostFromNotion(slug);
    if (!result) return null;
    return { ...result.meta, content: [] };
  }
  return getPostBySlugFromFile(slug);
}

/** 파일 기반 포스트 로드 (내부용) */
async function getPostBySlugFromFile(slug: string): Promise<BlogPost | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  try {
    const mod = await import(`./posts/${slug}`);
    return (mod.post as BlogPost) ?? null;
  } catch {
    return null;
  }
}
