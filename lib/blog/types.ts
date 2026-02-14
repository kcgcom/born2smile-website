// =============================================================
// 블로그 타입 정의
// =============================================================

export interface BlogPostSection {
  heading: string;
  content: string;
}

/** 목록 페이지용 메타데이터 (본문 미포함) */
export interface BlogPostMeta {
  id: number;
  slug: string;
  category: BlogCategoryValue;
  tags: string[];
  title: string;
  subtitle: string;
  excerpt: string;
  date: string;
  readTime: string;
}

/** 상세 페이지용 전체 데이터 (본문 포함) */
export interface BlogPost extends BlogPostMeta {
  content: BlogPostSection[];
}

export const BLOG_TAGS = [
  "치료후관리",
  "생활습관",
  "팩트체크",
  "증상가이드",
  "비교가이드",
  "어린이",
  "임산부",
  "시니어",
] as const;

export const BLOG_CATEGORIES = [
  "전체",
  "예방·구강관리",
  "보존치료",
  "보철치료",
  "임플란트",
  "교정치료",
  "구강건강상식",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/** 카테고리 중 "전체"를 제외한 실제 분류값 */
export type BlogCategoryValue = Exclude<BlogCategory, "전체">;
