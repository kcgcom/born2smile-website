// =============================================================
// 관리자 대시보드 데이터 모듈
// 개선 항목, 블로그 통계, 사이트 설정 상태
// =============================================================

import { LINKS } from "./constants";

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
  // HIGH — 16/18 완료
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
  { id: "h17", title: "모바일 메뉴 포커스 트랩", priority: "HIGH", status: "done", description: "메뉴 오픈 시 Tab 키 이탈 방지 + Escape 키 닫기" },
  { id: "h18", title: "온라인 예약 시스템", priority: "HIGH", status: "owner-decision", description: "온라인 예약 폼 도입 여부 — 현재 전화 상담 안내" },

  // =================================================================
  // MEDIUM — 24/28 완료
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
  { id: "m23", title: "GitHub Actions SHA 해시 고정", priority: "MEDIUM", status: "done", description: "actions/checkout@v4 태그 → SHA 해시로 공급망 보안 강화" },
  { id: "m24", title: "poweredByHeader: false", priority: "MEDIUM", status: "done", description: "next.config.ts에 X-Powered-By 헤더 비활성화" },
  { id: "m25", title: "SNS 링크 설정", priority: "MEDIUM", status: "owner-decision", description: "카카오, 인스타, 네이버 블로그/지도 URL 입력 필요" },
  { id: "m26", title: "카카오톡 채널 상담", priority: "MEDIUM", status: "owner-decision", description: "카카오톡 채널 URL 입력 시 상담 버튼 활성화" },
  { id: "m27", title: "네이버 지도 링크", priority: "MEDIUM", status: "owner-decision", description: "네이버 지도 URL 입력 시 Footer 아이콘 활성화" },
  { id: "m28", title: "인스타그램 연동", priority: "MEDIUM", status: "owner-decision", description: "인스타그램 URL 입력 시 Footer 아이콘 활성화" },

  // =================================================================
  // LOW — 13/16 완료
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
  { id: "l11", title: "PretendardVariable 폰트 서브셋", priority: "LOW", status: "done", description: "검토 완료 — 한국어 Variable 2MB는 표준 크기, 서브셋/정적 전환 시 이점 미미" },
  { id: "l12", title: "블로그 dateModified 필드", priority: "LOW", status: "done", description: "인프라 준비 완료 (sitemap, JSON-LD 지원). 포스트 수정 시 dateModified 필드 추가하면 자동 반영" },
  { id: "l13", title: "areaServed 확장", priority: "LOW", status: "done", description: "JSON-LD에 장기동, 우편번호 10089 추가" },
  { id: "l14", title: "target='_blank' 새 탭 표시", priority: "LOW", status: "done", description: "Footer, 리뷰 외부 링크에 '(새 창)' 또는 aria-label 보충" },
  { id: "l15", title: "Footer 헤딩 계층 수정", priority: "LOW", status: "done", description: "Footer h3 → h2로 변경 (최상위 섹션 헤딩)" },
  { id: "l16", title: "의사 프로필 사진 추가", priority: "LOW", status: "owner-decision", description: "한국 의료 사이트 최고 신뢰 신호 — 사진 제공 필요" },

  // =================================================================
  // 추가 개선 항목 — 2026-02-20 종합 분석
  // =================================================================
  { id: "h19", title: "error.tsx / not-found.tsx 페이지", priority: "HIGH", status: "done", description: "404/에러 페이지에 사이트 헤더/푸터/한국어 표시" },
  { id: "h20", title: "JSON.parse 에러 처리", priority: "HIGH", status: "done", description: "firebase-admin, GA4, SC 환경변수 파싱 실패 시 서버 크래시 방지" },
  { id: "h21", title: "UTC/KST 날짜 불일치 수정", priority: "HIGH", status: "done", description: "9곳 getTodayKST() 유틸리티 통일 — 예약 발행 시점 정확도 개선" },
  { id: "h22", title: "BlogContent Framer Motion 경량화", priority: "HIGH", status: "done", description: "블로그 목록에서 framer-motion 풀 번들 제거 — 클라이언트 번들 ~30KB 절감" },
  { id: "h23", title: "히어로 LCP 최적화", priority: "HIGH", status: "done", description: "h1/p 애니메이션 딜레이 제거 — LCP ~400ms 개선" },
  { id: "m29", title: "블로그 검색 debounce", priority: "MEDIUM", status: "done", description: "250ms debounce로 키 입력 시 과도한 필터링 방지" },
  { id: "m30", title: "블로그 자세히 읽기 aria-hidden", priority: "MEDIUM", status: "done", description: "스크린 리더가 비인터랙티브 텍스트를 건너뛰도록 개선" },
  { id: "m31", title: "About 진료시간 테이블 접근성", priority: "MEDIUM", status: "done", description: "caption, thead, th scope 추가" },
  { id: "m32", title: "calcChange() 중복 제거", priority: "MEDIUM", status: "done", description: "admin-analytics, admin-search-console → admin-utils 공통 모듈" },
  { id: "m33", title: "loading.tsx 서스펜스 바운더리", priority: "MEDIUM", status: "done", description: "blog/[slug], treatments/[slug] 네비게이션 시 즉각 로딩 표시" },
  { id: "m34", title: "블로그 셔플 CLS 개선", priority: "MEDIUM", status: "done", description: "일별 고정 시드 셔플로 SSR/CSR 콘텐츠 일치" },
  { id: "m35", title: "CTA 배너 공통 컴포넌트", priority: "MEDIUM", status: "done", description: "3곳 중복 CTA → CTABanner 컴포넌트 추출" },
  { id: "l17", title: "robots.txt /api 경로 차단", priority: "LOW", status: "done", description: "크롤러가 Admin API 경로에 접근하지 않도록 /api/ disallow 추가" },
  { id: "l18", title: "sitemap lastModified 갱신", priority: "LOW", status: "done", description: "PAGE_MODIFIED 날짜를 최신 변경일(2026-02-20)로 업데이트" },

  // =================================================================
  // 추가 개선 항목 — 2026-02-25 치과 선택 키워드 기반 개선
  // 환자 의사결정 여정: 정보 탐색(기존) → 치과 선택(신규) → 방문/전환
  // =================================================================

  // ── HIGH: 데이터 인프라 + 핵심 SEO ──
  { id: "h24", title: "트렌드 탭 '치과선택' 키워드 카테고리", priority: "HIGH", status: "done", description: "키워드 택소노미에 8번째 카테고리 추가. 서브그룹: 지역 검색(김포치과 추천, 김포 임플란트 잘하는 곳), 신뢰/비교(치과 고르는 법, 동네치과 vs 대학병원), 긴급/증상(이가 흔들려요, 잇몸 출혈 응급), 비용/보험(치과 비용 평균, 건강보험 적용), 후기/평판(치과 후기, 치과 리뷰 보는 법). 트렌드 탭에서 치과 선택 키워드의 검색량 추이와 콘텐츠 갭 분석 가능" },
  { id: "h25", title: "진료 과목 페이지 지역 SEO 메타데이터", priority: "HIGH", status: "done", description: "각 진료 과목 페이지(/treatments/[slug])의 title·description·OG에 '김포' 지역명 포함. 예: '김포 임플란트 | 서울본치과' → 검색엔진에서 '김포 임플란트' 검색 시 진료 페이지 직접 노출. JSON-LD MedicalProcedure에 availableIn(김포한강신도시) 추가" },

  // ── MEDIUM: 콘텐츠 전략 + 신뢰 강화 ──
  { id: "m36", title: "증상별 블로그 콘텐츠 + 응급 CTA", priority: "MEDIUM", status: "pending", description: "긴급 키워드 타겟 블로그 포스트 시리즈: '이가 흔들릴 때 대처법', '잇몸에서 피가 날 때', '치아가 깨졌을 때 응급 처치'. 포스트 상단에 '지금 전화 상담' CTA 배너 강조. 높은 전환 의도 키워드 → 즉시 방문/전화 유도" },
  { id: "m37", title: "치과 선택 가이드 블로그 시리즈", priority: "MEDIUM", status: "pending", description: "의사결정 단계 키워드 타겟: '좋은 치과 고르는 5가지 기준', '치과 후기 제대로 보는 법', '동네치과 vs 대학병원 언제 어디로', '김포 임플란트 치과 비교 가이드'. 건강상식 카테고리 또는 신규 카테고리로 발행" },
  { id: "m38", title: "의료진 소개 페이지 상세화", priority: "MEDIUM", status: "pending", description: "현재 간략한 약력 나열 → 치료 철학 스토리텔링, 전문 분야별 상세 설명, 학회 활동, 보수교육 이력 추가. '치과 고르는 법' 검색 시 신뢰 신호로 작용. 프로필 사진(l16)과 함께 진행 시 시너지 극대화" },
  { id: "m39", title: "리뷰/후기 섹션 강화", priority: "MEDIUM", status: "pending", description: "현재 정적 6개 후기 → Google 리뷰 작성 링크 + 네이버 플레이스 리뷰 링크 노출, 총 리뷰 수/평균 별점 실시간 표시(JSON-LD AggregateRating 연동). 진료 과목 페이지에도 해당 치료 관련 후기 발췌 표시" },

  // ── LOW: 보조 콘텐츠 ──
  { id: "l19", title: "진료 과목 FAQ 선택 관련 질문 추가", priority: "LOW", status: "done", description: "각 진료 과목 FAQ에 치과 선택 관련 질문 추가: '임플란트 잘하는 치과 고르는 기준은?', '교정 치과 선택 시 확인할 점은?' 등. FAQ 스키마로 검색 결과 리치 스니펫 확장 + 선택 의도 키워드 커버" },

  // =================================================================
  // 추가 개선 항목 — 2026-02-25 전환율·SEO·데이터 개선 아이디어
  // =================================================================

  // ── 완료 ──
  { id: "h26", title: "블로그 맥락형 CTA 배너", priority: "HIGH", status: "done", description: "블로그 포스트 하단 CTA를 카테고리→진료 매핑으로 맥락화. 임플란트 포스트→'임플란트 상담' CTA, 건강상식→일반 CTA 유지" },
  { id: "h27", title: "진료 과목 HowTo 스키마", priority: "HIGH", status: "done", description: "치료 과정 steps[]를 HowTo JSON-LD로 변환. Google 검색 리치 스니펫에 단계별 과정 표시" },

  // ── 미완료 — 추후 구현 ──
  { id: "m40", title: "진료 과목 간 교차 링크", priority: "MEDIUM", status: "done", description: "진료 페이지 하단에 '함께 알아보면 좋은 진료' 섹션. 내부 링크 강화 → 체류 시간 증가 + SEO" },
  { id: "m41", title: "시간대별 CTA 차별화", priority: "MEDIUM", status: "pending", description: "진료시간 중: '지금 전화 상담 가능' (초록), 진료시간 외: '내일 오전 진료 시작' 메시지. HOURS 데이터 활용" },
  { id: "m42", title: "블로그 목차(TOC) 자동 생성", priority: "MEDIUM", status: "done", description: "BlogPostSection[] 제목으로 앵커 링크 목차 표시. 체류 시간 증가 + Google passage ranking 개선" },
  { id: "m43", title: "카테고리 허브 페이지 지역 SEO", priority: "MEDIUM", status: "pending", description: "/blog/implant 등 허브 페이지 title/desc에 '김포' 지역 키워드 추가" },
  { id: "m44", title: "검색 의도(Search Intent) 분류", priority: "MEDIUM", status: "pending", description: "트렌드 탭 키워드에 의도 태그(정보형/비교형/전환형) 추가. 전환형 키워드 우선순위 상향" },
  { id: "m45", title: "SC 쿼리 × 트렌드 키워드 교차 분석", priority: "MEDIUM", status: "pending", description: "Search Console 유입 쿼리와 DataLab 시장 수요 교차 비교. '수요 높지만 유입 없는' 기회 키워드 식별" },
  { id: "l20", title: "계절성 트렌드 패턴 감지", priority: "LOW", status: "pending", description: "키워드 시계열 데이터로 연간 패턴 분석. 계절별 콘텐츠 발행 타이밍 추천" },
  { id: "l21", title: "전체 FAQ 독립 페이지", priority: "LOW", status: "done", description: "6개 진료 과목 FAQ를 모은 /faq 독립 페이지. '치과 자주 묻는 질문' 키워드 타겟" },
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
// 사이트 설정 상태
// -------------------------------------------------------------

export interface ConfigItem {
  label: string;
  configured: boolean;
  value?: string;
}

export interface SiteConfigStatus {
  snsLinks: ConfigItem[];
  supabase: ConfigItem[];
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

  const supabase: ConfigItem[] = [
    { label: "Supabase URL", configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
    { label: "Supabase Anon Key", configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { label: "Supabase Service Role Key", configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
  ];

  const env: ConfigItem[] = [
    { label: "카카오맵 앱 키", configured: !!process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY },
    { label: "관리자 이메일", configured: !!process.env.ADMIN_EMAILS },
  ];

  return { snsLinks, supabase, env };
}
