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

// 통합 출처: website-audit-2026-02-19.md + website-comprehensive-review-2026-02-20.md
// 마지막 동기화: 2026-02-20
export const IMPROVEMENT_ITEMS: ImprovementItem[] = [
  // =================================================================
  // CRITICAL — 4/4 완료
  // =================================================================
  { id: "c1", title: "CSP + HTTP 보안 헤더", priority: "CRITICAL", status: "done", description: "CSP, X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy" },
  { id: "c2", title: "JSON-LD 이미지 URL 수정", priority: "CRITICAL", status: "done", description: "/opengraph-image → /images/og-image.jpg 경로 수정" },
  { id: "c3", title: "React 안티패턴 수정", priority: "CRITICAL", status: "done", description: "Header setState 렌더 중 호출 → useEffect, Share 버튼 setTimeout 누수 → useRef cleanup" },
  { id: "c4", title: "Firestore 보안 규칙 기본 설정", priority: "CRITICAL", status: "done", description: "blog-likes 컬렉션만 read/write 허용, 나머지 전체 차단" },

  // =================================================================
  // HIGH — 15/18 완료
  // =================================================================
  { id: "h1", title: "이미지 최적화 (next/image)", priority: "HIGH", status: "done", description: "모든 이미지를 next/image로 변환, lazy loading" },
  { id: "h2", title: "시맨틱 HTML + ARIA", priority: "HIGH", status: "done", description: "시맨틱 태그, ARIA 라벨, skip link, 키보드 접근성" },
  { id: "h3", title: "JSON-LD 구조화 데이터", priority: "HIGH", status: "done", description: "Dentist, BlogPosting, FAQ, Breadcrumb, AggregateRating, CollectionPage" },
  { id: "h4", title: "색상 대비 WCAG AA", priority: "HIGH", status: "done", description: "text-gray-400→500, text-size-adjust: 100%, 모든 텍스트/배경 4.5:1 이상" },
  { id: "h5", title: "Sitemap + robots.txt", priority: "HIGH", status: "done", description: "동적 sitemap (개별 lastModified), 블로그 포스트 포함, /admin disallow" },
  { id: "h6", title: "블로그 시스템 구축", priority: "HIGH", status: "done", description: "78개 포스트, 카테고리/태그, 예약 발행, 무한 스크롤" },
  { id: "h7", title: "모바일 반응형 최적화", priority: "HIGH", status: "done", description: "모바일 퍼스트, 터치 타겟 44px, FloatingCTA 내비게이션" },
  { id: "h8", title: "Framer Motion / FAQ 최적화", priority: "HIGH", status: "done", description: "Header: CSS grid 애니메이션, FAQ: native details/summary 전환" },
  { id: "h9", title: "Firebase SDK 지연 로딩", priority: "HIGH", status: "done", description: "LikeButton dynamic import, Auth lazy getter 패턴" },
  { id: "h10", title: "Firestore 규칙 강화", priority: "HIGH", status: "done", description: "users.size() ≤ 10000, count == users.size() 불변식, slug 정규식" },
  { id: "h11", title: "블로그 카드 인터랙티브 수정", priority: "HIGH", status: "done", description: "Link/button 중첩 → z-index 분리, 키보드 내비 정상화" },
  { id: "h12", title: "aria-live 영역 추가", priority: "HIGH", status: "done", description: "블로그 필터 결과 aria-live='polite', 빈 결과 role='status'" },
  { id: "h13", title: "스크롤 이벤트 스로틀링", priority: "HIGH", status: "done", description: "Header scroll: requestAnimationFrame + passive: true" },
  { id: "h14", title: "별점/전화 버튼 접근성", priority: "HIGH", status: "done", description: "별점 aria-label, 전화 버튼 min-h-[44px] 터치 타겟" },
  { id: "h15", title: "관리자 대시보드", priority: "HIGH", status: "done", description: "Firebase Auth Google 로그인, 이메일 화이트리스트, 개선 현황/블로그 통계" },
  { id: "h16", title: "페이지별 OG 이미지 차별화", priority: "HIGH", status: "pending", description: "모든 페이지 동일 OG 이미지 → 카테고리/진료별 구분 이미지 또는 동적 생성" },
  { id: "h17", title: "모바일 메뉴 포커스 트랩", priority: "HIGH", status: "pending", description: "메뉴 오픈 시 Tab 키 이탈 방지 + Escape 키 닫기" },
  { id: "h18", title: "온라인 예약 시스템", priority: "HIGH", status: "owner-decision", description: "온라인 예약 폼 도입 여부 — 현재 전화 상담 안내" },

  // =================================================================
  // MEDIUM — 22/26 완료
  // =================================================================
  { id: "m1", title: "블로그 좋아요 기능", priority: "MEDIUM", status: "done", description: "Firestore 기반, optimistic update, UUID 사용자 식별" },
  { id: "m2", title: "카카오맵 통합", priority: "MEDIUM", status: "done", description: "주소 기반 geocoding + 폴백 좌표, HTTPS 명시" },
  { id: "m3", title: "환자 후기 섹션", priority: "MEDIUM", status: "done", description: "네이버/구글 리뷰 6개 표시, JSON-LD Review 스키마" },
  { id: "m4", title: "블로그 공유 버튼 통합", priority: "MEDIUM", status: "done", description: "Web Share API + 클립보드 폴백, 코드 중복 제거" },
  { id: "m5", title: "예약 발행 + IndexNow", priority: "MEDIUM", status: "done", description: "GitHub Actions 매일 재빌드 + 새 포스트 자동 검색엔진 알림" },
  { id: "m6", title: "로컬 폰트 최적화", priority: "MEDIUM", status: "done", description: "Pretendard, Noto Serif KR woff2, Gowun Batang preload: false" },
  { id: "m7", title: "진료↔블로그 교차 참조", priority: "MEDIUM", status: "done", description: "진료 상세에 관련 블로그 포스트 표시, 날짜순 정렬" },
  { id: "m8", title: "코드 중복 제거", priority: "MEDIUM", status: "done", description: "formatDate → lib/format.ts, NAV_ITEMS → lib/constants.ts 중앙화" },
  { id: "m9", title: "메타데이터 자동 생성", priority: "MEDIUM", status: "done", description: "빌드 시 포스트에서 메타 자동 추출, readTime 자동 계산" },
  { id: "m10", title: "블로그 랜덤 셔플 표시", priority: "MEDIUM", status: "done", description: "SSR 최신순 + CSR Fisher-Yates 셔플" },
  { id: "m11", title: "BlogPosting headline 제한", priority: "MEDIUM", status: "done", description: "JSON-LD headline .slice(0, 110) 적용" },
  { id: "m12", title: "MedicalWebPage 스키마 보강", priority: "MEDIUM", status: "done", description: "medicalAudience: Patient, specialty: Dentistry 추가" },
  { id: "m13", title: "블로그 허브 CollectionPage", priority: "MEDIUM", status: "done", description: "CollectionPage + ItemList JSON-LD 스키마 추가" },
  { id: "m14", title: "Contact 페이지 SEO", priority: "MEDIUM", status: "done", description: "김포치과 예약, 김포한강신도시 치과 등 로컬 키워드 포함" },
  { id: "m15", title: "Sitemap 개별 lastModified", priority: "MEDIUM", status: "done", description: "PAGE_MODIFIED 객체로 페이지별 개별 날짜 적용" },
  { id: "m16", title: "textZoom 보정 스크립트", priority: "MEDIUM", status: "done", description: "Android WebView 폰트 크기 역보정" },
  { id: "m17", title: "무한 스크롤 로딩/완료 상태", priority: "MEDIUM", status: "done", description: "로딩 스피너 + 완료 메시지 + 전체 글 수 표시" },
  { id: "m18", title: "OG 메타데이터 보강", priority: "MEDIUM", status: "done", description: "/about, /treatments 페이지 openGraph + twitter 메타데이터" },
  { id: "m19", title: "console.error/warn 가드", priority: "MEDIUM", status: "done", description: "LikeButton: NODE_ENV === 'development' 조건부 로깅" },
  { id: "m20", title: "Framer Motion 페이지 애니메이션", priority: "MEDIUM", status: "done", description: "FadeIn, StaggerContainer, StaggerItem 컴포넌트" },
  { id: "m21", title: "FloatingCTA 모바일 내비", priority: "MEDIUM", status: "done", description: "하단 고정 5버튼 네비게이션 바, 골드 색상 상담 버튼" },
  { id: "m22", title: "관리자 인증 시스템", priority: "MEDIUM", status: "done", description: "Firebase Auth Google 로그인, 이메일 화이트리스트, AuthGuard" },
  { id: "m23", title: "GitHub Actions SHA 해시 고정", priority: "MEDIUM", status: "pending", description: "actions/checkout@v4 태그 → SHA 해시로 공급망 보안 강화" },
  { id: "m24", title: "poweredByHeader: false", priority: "MEDIUM", status: "pending", description: "next.config.ts에 X-Powered-By 헤더 비활성화" },
  { id: "m25", title: "SNS 링크 설정", priority: "MEDIUM", status: "owner-decision", description: "카카오, 인스타, 네이버 블로그/지도 URL 입력 필요" },
  { id: "m26", title: "카카오톡 채널 상담", priority: "MEDIUM", status: "owner-decision", description: "카카오톡 채널 URL 입력 시 상담 버튼 활성화" },
  { id: "m27", title: "네이버 지도 링크", priority: "MEDIUM", status: "owner-decision", description: "네이버 지도 URL 입력 시 Footer 아이콘 활성화" },
  { id: "m28", title: "인스타그램 연동", priority: "MEDIUM", status: "owner-decision", description: "인스타그램 URL 입력 시 Footer 아이콘 활성화" },

  // =================================================================
  // LOW — 10/16 완료
  // =================================================================
  { id: "l1", title: "웹마스터 인증", priority: "LOW", status: "done", description: "Bing BingSiteAuth.xml + Naver naver*.html 인증 파일" },
  { id: "l2", title: "Firebase Hosting redirect", priority: "LOW", status: "done", description: "인증 파일 서빙 + App Hosting redirect 설정" },
  { id: "l3", title: "prefers-reduced-motion 지원", priority: "LOW", status: "done", description: "모션 감소 설정 시 애니메이션 비활성화" },
  { id: "l4", title: "ESLint + TypeScript strict", priority: "LOW", status: "done", description: "core-web-vitals 규칙, any 타입 0건" },
  { id: "l5", title: "standalone 빌드 최적화", priority: "LOW", status: "done", description: "Cloud Run 배포용 standalone output" },
  { id: "l6", title: "Permissions-Policy 헤더", priority: "LOW", status: "done", description: "camera, microphone, geolocation 비활성화" },
  { id: "l7", title: "키보드 접근성 스타일", priority: "LOW", status: "done", description: "focus-visible 2px solid primary, 탭 순서 정상" },
  { id: "l8", title: "Gowun Batang preload 최적화", priority: "LOW", status: "done", description: "홈페이지 전용 폰트 preload: false 설정" },
  { id: "l9", title: "관련 포스트 날짜순 정렬", priority: "LOW", status: "done", description: "getRelatedBlogPosts() 최신 포스트 우선 정렬" },
  { id: "l10", title: "스크롤 smooth reduced-motion", priority: "LOW", status: "done", description: "window.scrollTo smooth 스크롤 reduced-motion 적용" },
  { id: "l11", title: "PretendardVariable 폰트 서브셋", priority: "LOW", status: "pending", description: "현재 2MB — 정적 웨이트 서브셋으로 전환 검토" },
  { id: "l12", title: "블로그 dateModified 필드", priority: "LOW", status: "pending", description: "수정된 포스트에 dateModified 추가 (현재 0개 설정)" },
  { id: "l13", title: "areaServed 확장", priority: "LOW", status: "pending", description: "JSON-LD에 장기동, 우편번호 10089 추가" },
  { id: "l14", title: "target='_blank' 새 탭 표시", priority: "LOW", status: "pending", description: "Footer, 리뷰 외부 링크에 '(새 창)' 또는 aria-label 보충" },
  { id: "l15", title: "Footer 헤딩 계층 수정", priority: "LOW", status: "pending", description: "Footer h3 → h2로 변경 (최상위 섹션 헤딩)" },
  { id: "l16", title: "의사 프로필 사진 추가", priority: "LOW", status: "owner-decision", description: "한국 의료 사이트 최고 신뢰 신호 — 사진 제공 필요" },
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
    { label: "Firebase Project ID", configured: true, value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "seoul-born2smile (기본값)" },
  ];

  const env: ConfigItem[] = [
    { label: "카카오맵 앱 키", configured: !!process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY },
    { label: "관리자 이메일", configured: !!process.env.NEXT_PUBLIC_ADMIN_EMAILS },
  ];

  return { snsLinks, firebase, env };
}
