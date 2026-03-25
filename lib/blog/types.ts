// =============================================================
// 블로그 타입 정의
// =============================================================

export interface BlogPostSection {
  heading: string;
  content: string;
}

export interface BlogRelatedLinkItem {
  title: string;
  href: string;
  description?: string;
}

export type BlogBlock =
  | {
      type: "heading";
      level: 2 | 3;
      text: string;
    }
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      style: "bullet" | "number";
      items: string[];
    }
  | {
      type: "faq";
      question: string;
      answer: string;
    }
  | {
      type: "relatedLinks";
      items: BlogRelatedLinkItem[];
    };

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
  /** legacy section-based content */
  content?: BlogPostSection[];
  /** block-based rich content */
  blocks?: BlogBlock[];
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

export const BLOG_CATEGORY_SLUGS = [
  "prevention",
  "restorative",
  "prosthetics",
  "implant",
  "orthodontics",
  "pediatric",
  "health-tips",
] as const;

export type BlogCategorySlug = (typeof BLOG_CATEGORY_SLUGS)[number];

export const BLOG_CATEGORY_LABELS_LIST = [
  "예방관리",
  "보존치료",
  "보철치료",
  "임플란트",
  "치아교정",
  "소아치료",
  "건강상식",
] as const;

export type BlogCategoryLabel = (typeof BLOG_CATEGORY_LABELS_LIST)[number];

export const BLOG_CATEGORIES = [
  "전체",
  ...BLOG_CATEGORY_LABELS_LIST,
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/** UI 필터용 category 값 */
export type BlogCategoryFilter = "all" | BlogCategorySlug;

/** canonical blog category 값 */
export type BlogCategoryValue = BlogCategorySlug;

export type BlogTag = (typeof BLOG_TAGS)[number];
