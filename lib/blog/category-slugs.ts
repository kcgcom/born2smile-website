// =============================================================
// 블로그 카테고리 canonical slug ↔ 한글 label 매핑
// =============================================================

import {
  BLOG_CATEGORY_SLUGS,
  type BlogCategoryLabel,
  type BlogCategorySlug,
  type BlogCategoryValue,
} from "./types";

export const BLOG_CATEGORY_LABELS: Record<BlogCategorySlug, BlogCategoryLabel> = {
  prevention: "예방관리",
  restorative: "보존치료",
  prosthetics: "보철치료",
  implant: "임플란트",
  orthodontics: "치아교정",
  pediatric: "소아치료",
  "health-tips": "건강상식",
};

export const CATEGORY_LABEL_TO_SLUG = Object.fromEntries(
  Object.entries(BLOG_CATEGORY_LABELS).map(([slug, label]) => [label, slug]),
) as Record<BlogCategoryLabel, BlogCategorySlug>;

export const ALL_CATEGORY_SLUGS = [...BLOG_CATEGORY_SLUGS];

export function isBlogCategorySlug(value: string): value is BlogCategorySlug {
  return BLOG_CATEGORY_SLUGS.includes(value as BlogCategorySlug);
}

export function isBlogCategoryLabel(value: string): value is BlogCategoryLabel {
  return value in CATEGORY_LABEL_TO_SLUG;
}

export function getCategoryFromSlug(slug: string): BlogCategorySlug | null {
  return isBlogCategorySlug(slug) ? slug : null;
}

export function getCategoryFromLabel(label: string): BlogCategorySlug | null {
  return isBlogCategoryLabel(label) ? CATEGORY_LABEL_TO_SLUG[label] : null;
}

export function normalizeBlogCategory(value: string): BlogCategorySlug | null {
  return getCategoryFromSlug(value) ?? getCategoryFromLabel(value);
}

export function getCategorySlug(category: BlogCategoryValue): BlogCategorySlug {
  return category;
}

export function getCategoryLabel(category: BlogCategoryValue): BlogCategoryLabel {
  return BLOG_CATEGORY_LABELS[category];
}

export function getBlogPostUrl(slug: string, category: BlogCategoryValue): string {
  return `/blog/${category}/${slug}`;
}

export function getAdminPreviewUrl(slug: string, category: BlogCategoryValue): string {
  return `/admin/preview/${category}/${slug}`;
}
