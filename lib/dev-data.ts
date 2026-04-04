// =============================================================
// 정적 개발 데이터 (수동 관리)
// 빌드 매니페스트와 별도로, 코드 변경 시 수동 업데이트 필요
// =============================================================

// -------------------------------------------------------------
// Next.js 설정 요약
// -------------------------------------------------------------

export const NEXTJS_CONFIG = {
  framework: "Next.js 16 (App Router)",
  deployment: "Vercel (Edge Network + Serverless Functions)",
  region: "icn1 (Seoul)",
  securityHeaders: [
    "Content-Security-Policy",
    "X-Frame-Options: DENY",
    "Strict-Transport-Security (2년, preload)",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Permissions-Policy (camera/mic/geo 비활성화)",
  ],
} as const;

// -------------------------------------------------------------
// ESLint 설정 요약
// -------------------------------------------------------------

export const ESLINT_CONFIG = {
  configFile: "eslint.config.mjs (flat config)",
  ruleSets: ["eslint-config-next/core-web-vitals", "eslint-config-next/typescript"],
  ignorePatterns: [".next/", "out/", "build/", "next-env.d.ts"],
} as const;

// -------------------------------------------------------------
// Supabase 테이블 구조
// -------------------------------------------------------------

export interface DatabaseTable {
  name: string;
  primaryKey: string;
  access: string;
  purpose: string;
}

export const DATABASE_TABLES: DatabaseTable[] = [
  {
    name: "blog_posts",
    primaryKey: "slug",
    access: "service_role 전용 (RLS)",
    purpose: "블로그 포스트",
  },
  {
    name: "blog_likes",
    primaryKey: "slug",
    access: "anon SELECT + RPC toggle_like",
    purpose: "좋아요 카운트 + 사용자 UUID",
  },
  {
    name: "site_config",
    primaryKey: "type",
    access: "service_role 전용 (RLS)",
    purpose: "사이트 설정 + 발행 스케줄",
  },
  {
    name: "api_cache",
    primaryKey: "key",
    access: "service_role 전용 (RLS)",
    purpose: "API 응답 캐시 (PSI, 검색광고)",
  },
];

// -------------------------------------------------------------
// API 엔드포인트 목록
// -------------------------------------------------------------

export interface ApiEndpoint {
  path: string;
  methods: string[];
  auth: boolean;
  description: string;
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    path: "/api/admin/analytics",
    methods: ["GET"],
    auth: true,
    description: "GA4 트래픽 데이터 (7d/30d/90d)",
  },
  {
    path: "/api/admin/search-console",
    methods: ["GET"],
    auth: true,
    description: "Search Console 검색 성과",
  },
  {
    path: "/api/admin/blog-likes",
    methods: ["GET"],
    auth: true,
    description: "블로그 좋아요 집계",
  },
  {
    path: "/api/admin/blog-posts",
    methods: ["GET", "POST"],
    auth: true,
    description: "블로그 포스트 목록/생성 (Zod 검증)",
  },
  {
    path: "/api/admin/blog-posts/[slug]",
    methods: ["GET", "PUT", "DELETE"],
    auth: true,
    description: "블로그 포스트 상세/수정/삭제",
  },
  {
    path: "/api/admin/site-config/[type]",
    methods: ["GET", "PUT"],
    auth: true,
    description: "사이트 설정 (links|clinic|hours|schedule)",
  },
  {
    path: "/api/admin/naver-datalab",
    methods: ["GET"],
    auth: true,
    description: "네이버 DataLab 검색 트렌드",
  },
  {
    path: "/api/admin/naver-datalab/overview",
    methods: ["GET"],
    auth: true,
    description: "트렌드 개요 (검색량/트렌드)",
  },
  {
    path: "/api/admin/naver-datalab/category/[slug]",
    methods: ["GET"],
    auth: true,
    description: "카테고리별 상세 트렌드",
  },
  {
    path: "/api/admin/naver-searchad/volume",
    methods: ["GET"],
    auth: true,
    description: "네이버 검색광고 키워드 검색량",
  },
  {
    path: "/api/dev/env-status",
    methods: ["GET"],
    auth: true,
    description: "환경변수 설정 상태",
  },
  {
    path: "/api/dev/pagespeed",
    methods: ["GET"],
    auth: true,
    description: "PageSpeed Insights 성능 분석",
  },
  {
    path: "/api/dev/sentry-test",
    methods: ["POST"],
    auth: true,
    description: "Sentry 서버 테스트 이벤트 전송",
  },
  {
    path: "/api/cron/rebuild",
    methods: ["GET"],
    auth: true,
    description: "예약 발행 ISR 재검증 (Vercel Cron)",
  },
];

// -------------------------------------------------------------
// 캐시 TTL 정보
// -------------------------------------------------------------

export interface CacheTtlEntry {
  key: string;
  seconds: number;
  label: string;
}

export const CACHE_TTLS: CacheTtlEntry[] = [
  { key: "GA4", seconds: 3600, label: "1시간" },
  { key: "SEARCH_CONSOLE", seconds: 21600, label: "6시간" },
  { key: "NAVER_DATALAB", seconds: 21600, label: "6시간" },
  { key: "NAVER_SEARCHAD", seconds: 86400, label: "24시간" },
  { key: "PAGESPEED", seconds: 86400, label: "24시간" },
  { key: "BLOG_LIKES", seconds: 300, label: "5분" },
  { key: "BLOG_POSTS", seconds: 3600, label: "1시간" },
];

// -------------------------------------------------------------
// 환경변수 허용 목록
// -------------------------------------------------------------

export interface EnvVariable {
  key: string;
  label: string;
  required: boolean;
  scope: "public" | "private";
}

export const ENV_VARIABLES: EnvVariable[] = [
  { key: "NEXT_PUBLIC_POSTHOG_TOKEN", label: "PostHog 공개 토큰", required: false, scope: "public" },
  { key: "NEXT_PUBLIC_POSTHOG_HOST", label: "PostHog 수집 호스트", required: false, scope: "public" },
  { key: "NEXT_PUBLIC_POSTHOG_UI_HOST", label: "PostHog UI 호스트", required: false, scope: "public" },
  { key: "NEXT_PUBLIC_KAKAO_MAP_APP_KEY", label: "카카오맵 앱 키", required: true, scope: "public" },
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", required: true, scope: "public" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase Anon Key", required: true, scope: "public" },
  { key: "POSTHOG_PROJECT_ID", label: "PostHog Project ID", required: false, scope: "private" },
  { key: "POSTHOG_API_KEY", label: "PostHog API Key", required: false, scope: "private" },
  { key: "POSTHOG_BASE_URL", label: "PostHog App URL", required: false, scope: "private" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role Key", required: true, scope: "private" },
  { key: "ADMIN_EMAILS", label: "관리자 이메일", required: true, scope: "private" },
  { key: "GA4_PROPERTY_ID", label: "GA4 속성 ID", required: false, scope: "private" },
  { key: "SEARCH_CONSOLE_SITE_URL", label: "Search Console URL", required: false, scope: "private" },
  { key: "NAVER_DATALAB_CLIENT_ID", label: "네이버 DataLab Client ID", required: false, scope: "private" },
  { key: "NAVER_DATALAB_CLIENT_SECRET", label: "네이버 DataLab Client Secret", required: false, scope: "private" },
  { key: "NAVER_SEARCHAD_API_KEY", label: "네이버 검색광고 API Key", required: false, scope: "private" },
  { key: "NAVER_SEARCHAD_SECRET_KEY", label: "네이버 검색광고 Secret Key", required: false, scope: "private" },
  { key: "NAVER_SEARCHAD_CUSTOMER_ID", label: "네이버 검색광고 Customer ID", required: false, scope: "private" },
  { key: "PAGESPEED_API_KEY", label: "PageSpeed Insights API Key", required: false, scope: "private" },
  { key: "NEXT_PUBLIC_SENTRY_DSN", label: "Sentry DSN", required: true, scope: "public" },
  { key: "NEXT_PUBLIC_SENTRY_ENVIRONMENT", label: "Sentry 공개 환경명", required: false, scope: "public" },
  { key: "NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE", label: "Sentry Trace Sample Rate", required: false, scope: "public" },
  { key: "SENTRY_ENVIRONMENT", label: "Sentry 서버 환경명", required: false, scope: "private" },
  { key: "SENTRY_ORG", label: "Sentry Org Slug", required: true, scope: "private" },
  { key: "SENTRY_PROJECT", label: "Sentry Project Slug", required: true, scope: "private" },
  { key: "SENTRY_AUTH_TOKEN", label: "Sentry Auth Token", required: true, scope: "private" },
  { key: "GOOGLE_SERVICE_ACCOUNT_KEY", label: "Google 서비스 계정 JSON", required: false, scope: "private" },
  { key: "CRON_SECRET", label: "Vercel Cron 인증 토큰", required: true, scope: "private" },
];
