// =============================================================
// 관리자 대시보드 데이터 모듈
// 개선 항목, 블로그 통계, 사이트 설정 상태
// =============================================================

import { BLOG_POSTS_META } from "./blog";
import { LINKS } from "./constants";
import type { BlogCategoryValue } from "./blog/types";

// -------------------------------------------------------------
// 개선 항목 데이터
// -------------------------------------------------------------

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ImprovementStatus = "done" | "pending" | "owner-decision";

export interface ImprovementItem {
  id: string;
  title: string;
  priority: Priority;
  status: ImprovementStatus;
  description: string;
}

export const IMPROVEMENT_ITEMS: ImprovementItem[] = [
  // CRITICAL — 4/4 완료
  { id: "c1", title: "XSS 방지 — 사용자 입력 새니타이즈", priority: "CRITICAL", status: "done", description: "모든 사용자 입력에 DOMPurify 적용" },
  { id: "c2", title: "CSP 헤더 적용", priority: "CRITICAL", status: "done", description: "Content-Security-Policy 헤더 설정 완료" },
  { id: "c3", title: "Firestore 보안 규칙", priority: "CRITICAL", status: "done", description: "blog-likes 컬렉션만 read/write 허용" },
  { id: "c4", title: "HTTPS + HSTS 적용", priority: "CRITICAL", status: "done", description: "Strict-Transport-Security 헤더 적용" },
  // HIGH — 8/9
  { id: "h1", title: "이미지 최적화 (next/image)", priority: "HIGH", status: "done", description: "모든 이미지를 next/image로 변환" },
  { id: "h2", title: "시맨틱 HTML + ARIA", priority: "HIGH", status: "done", description: "시맨틱 태그, ARIA 라벨, skip link" },
  { id: "h3", title: "JSON-LD 구조화 데이터", priority: "HIGH", status: "done", description: "Dentist, BlogPosting, FAQ, Breadcrumb" },
  { id: "h4", title: "색상 대비 WCAG AA", priority: "HIGH", status: "done", description: "모든 텍스트/배경 색상 대비 4.5:1 이상" },
  { id: "h5", title: "Sitemap + robots.txt", priority: "HIGH", status: "done", description: "동적 sitemap 생성, 블로그 포스트 포함" },
  { id: "h6", title: "블로그 시스템 구축", priority: "HIGH", status: "done", description: "78개 포스트, 카테고리/태그, 예약 발행" },
  { id: "h7", title: "모바일 반응형 최적화", priority: "HIGH", status: "done", description: "모든 페이지 모바일 퍼스트 반응형" },
  { id: "h8", title: "키보드 접근성", priority: "HIGH", status: "done", description: "focus-visible 스타일, 탭 순서" },
  { id: "h9", title: "온라인 예약 시스템", priority: "HIGH", status: "owner-decision", description: "온라인 예약 폼 도입 여부 — 현재 전화 상담 안내" },
  // MEDIUM — 14/18
  { id: "m1", title: "블로그 좋아요 기능", priority: "MEDIUM", status: "done", description: "Firestore 기반 좋아요, optimistic update" },
  { id: "m2", title: "카카오맵 통합", priority: "MEDIUM", status: "done", description: "주소 기반 geocoding + 폴백 좌표" },
  { id: "m3", title: "환자 후기 섹션", priority: "MEDIUM", status: "done", description: "네이버/구글 리뷰 6개 표시" },
  { id: "m4", title: "블로그 공유 버튼", priority: "MEDIUM", status: "done", description: "Web Share API + 클립보드 폴백" },
  { id: "m5", title: "무한 스크롤 블로그", priority: "MEDIUM", status: "done", description: "Intersection Observer, 12개씩 로드" },
  { id: "m6", title: "예약 발행 시스템", priority: "MEDIUM", status: "done", description: "GitHub Actions 매일 자동 재빌드" },
  { id: "m7", title: "IndexNow 연동", priority: "MEDIUM", status: "done", description: "새 포스트 자동 검색엔진 알림" },
  { id: "m8", title: "Framer Motion 애니메이션", priority: "MEDIUM", status: "done", description: "FadeIn, StaggerContainer 컴포넌트" },
  { id: "m9", title: "로컬 폰트 최적화", priority: "MEDIUM", status: "done", description: "Pretendard, Noto Serif KR woff2" },
  { id: "m10", title: "진료↔블로그 교차 참조", priority: "MEDIUM", status: "done", description: "진료 상세에 관련 블로그 포스트 표시" },
  { id: "m11", title: "FloatingCTA 모바일 내비", priority: "MEDIUM", status: "done", description: "하단 고정 5버튼 네비게이션 바" },
  { id: "m12", title: "textZoom 보정 스크립트", priority: "MEDIUM", status: "done", description: "Android WebView 폰트 크기 역보정" },
  { id: "m13", title: "메타데이터 자동 생성", priority: "MEDIUM", status: "done", description: "빌드 시 포스트에서 메타 자동 추출" },
  { id: "m14", title: "블로그 랜덤 셔플 표시", priority: "MEDIUM", status: "done", description: "SSR 최신순 + CSR Fisher-Yates 셔플" },
  { id: "m15", title: "SNS 링크 설정", priority: "MEDIUM", status: "owner-decision", description: "카카오, 인스타, 네이버 블로그/지도 URL 입력 필요" },
  { id: "m16", title: "카카오톡 채널 상담", priority: "MEDIUM", status: "owner-decision", description: "카카오톡 채널 URL 입력 시 상담 버튼 활성화" },
  { id: "m17", title: "네이버 지도 링크", priority: "MEDIUM", status: "owner-decision", description: "네이버 지도 URL 입력 시 Footer 아이콘 활성화" },
  { id: "m18", title: "인스타그램 연동", priority: "MEDIUM", status: "owner-decision", description: "인스타그램 URL 입력 시 Footer 아이콘 활성화" },
  // LOW — 7/7
  { id: "l1", title: "Bing 웹마스터 인증", priority: "LOW", status: "done", description: "BingSiteAuth.xml 설정 완료" },
  { id: "l2", title: "Naver 웹마스터 인증", priority: "LOW", status: "done", description: "naver*.html 인증 파일 배포" },
  { id: "l3", title: "Firebase Hosting redirect", priority: "LOW", status: "done", description: "인증 파일 서빙 + App Hosting redirect" },
  { id: "l4", title: "prefers-reduced-motion 지원", priority: "LOW", status: "done", description: "모션 감소 설정 시 애니메이션 비활성화" },
  { id: "l5", title: "ESLint 설정", priority: "LOW", status: "done", description: "core-web-vitals + TypeScript 규칙" },
  { id: "l6", title: "standalone 빌드 최적화", priority: "LOW", status: "done", description: "Cloud Run 배포용 standalone output" },
  { id: "l7", title: "Permissions-Policy 헤더", priority: "LOW", status: "done", description: "camera, microphone, geolocation 비활성화" },
];

export interface ImprovementStats {
  total: number;
  done: number;
  pending: number;
  ownerDecision: number;
  byPriority: { priority: Priority; total: number; done: number }[];
}

export function getImprovementStats(): ImprovementStats {
  const total = IMPROVEMENT_ITEMS.length;
  const done = IMPROVEMENT_ITEMS.filter((i) => i.status === "done").length;
  const pending = IMPROVEMENT_ITEMS.filter((i) => i.status === "pending").length;
  const ownerDecision = IMPROVEMENT_ITEMS.filter((i) => i.status === "owner-decision").length;

  const priorities: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const byPriority = priorities.map((p) => {
    const items = IMPROVEMENT_ITEMS.filter((i) => i.priority === p);
    return {
      priority: p,
      total: items.length,
      done: items.filter((i) => i.status === "done").length,
    };
  });

  return { total, done, pending, ownerDecision, byPriority };
}

// -------------------------------------------------------------
// 블로그 통계
// -------------------------------------------------------------

export interface BlogStats {
  total: number;
  published: number;
  scheduled: number;
  byCategory: { category: BlogCategoryValue; count: number }[];
  scheduledPosts: { slug: string; title: string; date: string }[];
}

export function getBlogStats(): BlogStats {
  const today = new Date().toISOString().slice(0, 10);
  const total = BLOG_POSTS_META.length;
  const published = BLOG_POSTS_META.filter((p) => p.date <= today).length;
  const scheduled = total - published;

  const categoryMap = new Map<BlogCategoryValue, number>();
  for (const post of BLOG_POSTS_META) {
    categoryMap.set(post.category, (categoryMap.get(post.category) ?? 0) + 1);
  }
  const byCategory = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const scheduledPosts = BLOG_POSTS_META
    .filter((p) => p.date > today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ slug: p.slug, title: p.title, date: p.date }));

  return { total, published, scheduled, byCategory, scheduledPosts };
}

// -------------------------------------------------------------
// 사이트 설정 상태
// -------------------------------------------------------------

export interface ConfigItem {
  label: string;
  configured: boolean;
  value?: string;
}

export interface SiteConfigStatus {
  snsLinks: ConfigItem[];
  firebase: ConfigItem[];
  env: ConfigItem[];
}

export function getSiteConfigStatus(): SiteConfigStatus {
  const snsLinks: ConfigItem[] = [
    { label: "카카오톡 채널", configured: !!LINKS.kakaoChannel, value: LINKS.kakaoChannel || "미설정" },
    { label: "인스타그램", configured: !!LINKS.instagram, value: LINKS.instagram || "미설정" },
    { label: "네이버 블로그", configured: !!LINKS.naverBlog, value: LINKS.naverBlog || "미설정" },
    { label: "네이버 지도", configured: !!LINKS.naverMap, value: LINKS.naverMap || "미설정" },
    { label: "카카오맵", configured: !!LINKS.kakaoMap, value: LINKS.kakaoMap || "미설정" },
  ];

  const firebase: ConfigItem[] = [
    { label: "Firebase API Key", configured: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY },
    { label: "Firebase Project ID", configured: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID },
  ];

  const env: ConfigItem[] = [
    { label: "카카오맵 앱 키", configured: !!process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY },
    { label: "관리자 이메일", configured: !!process.env.NEXT_PUBLIC_ADMIN_EMAILS },
  ];

  return { snsLinks, firebase, env };
}
