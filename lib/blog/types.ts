// =============================================================
// 블로그 타입 정의
// =============================================================

export interface BlogPostSection {
  heading: string;
  content: string;
}

/** 목록 페이지용 메타데이터 (본문 미포함) */
export interface BlogPostMeta {
  slug: string;
  category: BlogCategoryValue;
  tags: (typeof BLOG_TAGS)[number][];
  title: string;
  subtitle: string;
  excerpt: string;
  date: string;
  dateModified?: string;
  readTime: string;
}

/** 상세 페이지용 전체 데이터 (본문 포함) */
export interface BlogPost extends Omit<BlogPostMeta, "readTime"> {
  content: BlogPostSection[];
  /** 수동 입력 시 사용. 생략하면 빌드 시 content 글자 수 기반 자동 계산 (한국어 분당 ~500자) */
  readTime?: string;
  /** 콘텐츠 검수 완료일 (YYYY-MM-DD). 미입력 시 미검수 상태 */
  reviewedDate?: string;
}

export const BLOG_TAGS = [
  "치료후관리",
  "생활습관",
  "팩트체크",
  "증상가이드",
  "비교가이드",
  "임산부",
  "시니어",
] as const;

export const BLOG_CATEGORIES = [
  "전체",
  "예방관리",
  "보존치료",
  "보철치료",
  "임플란트",
  "치아교정",
  "소아치료",
  "건강상식",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/** 카테고리 중 "전체"를 제외한 실제 분류값 */
export type BlogCategoryValue = Exclude<BlogCategory, "전체">;

export type BlogTag = (typeof BLOG_TAGS)[number];
