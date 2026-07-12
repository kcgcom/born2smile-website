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
  { key: "NAVER_DATALAB", seconds: 86400, label: "24시간" },
  { key: "NAVER_SEARCHAD", seconds: 86400, label: "24시간" },
  { key: "PAGESPEED", seconds: 86400, label: "24시간" },
  { key: "BLOG_LIKES", seconds: 300, label: "5분" },
  { key: "BLOG_POSTS", seconds: 3600, label: "1시간" },
];

// -------------------------------------------------------------
// 환경변수 허용 목록
// -------------------------------------------------------------

export type EnvGroup = "supabase" | "auth" | "google" | "naver" | "posthog" | "sentry" | "kakao" | "infra";

export const ENV_GROUP_LABELS: Record<EnvGroup, string> = {
  supabase: "Supabase",
  auth: "인증",
  google: "Google (GA4·SC·PSI·Gemini)",
  naver: "네이버 (DataLab·검색광고)",
  posthog: "PostHog",
  sentry: "Sentry",
  kakao: "카카오",
  infra: "인프라",
};

export interface EnvVariable {
  key: string;
  label: string;
  required: boolean;
  scope: "public" | "private";
  group: EnvGroup;
}

export const ENV_VARIABLES: EnvVariable[] = [
  // ── Supabase ──
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", required: true, scope: "public", group: "supabase" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase Anon Key", required: true, scope: "public", group: "supabase" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role Key", required: true, scope: "private", group: "supabase" },

  // ── 인증 ──
  { key: "ADMIN_EMAILS", label: "관리자 이메일", required: true, scope: "private", group: "auth" },

  // ── Google ──
  { key: "GOOGLE_SERVICE_ACCOUNT_KEY", label: "Google 서비스 계정 JSON", required: false, scope: "private", group: "google" },
  { key: "GA4_PROPERTY_ID", label: "GA4 속성 ID", required: false, scope: "private", group: "google" },
  { key: "SEARCH_CONSOLE_SITE_URL", label: "Search Console URL", required: false, scope: "private", group: "google" },
  { key: "PAGESPEED_API_KEY", label: "PageSpeed Insights API Key", required: false, scope: "private", group: "google" },
  { key: "GEMINI_API_KEY", label: "Gemini API Key", required: false, scope: "private", group: "google" },

  // ── 네이버 ──
  { key: "NAVER_DATALAB_CLIENT_ID", label: "네이버 DataLab Client ID", required: false, scope: "private", group: "naver" },
  { key: "NAVER_DATALAB_CLIENT_SECRET", label: "네이버 DataLab Client Secret", required: false, scope: "private", group: "naver" },
  { key: "NAVER_SEARCHAD_API_KEY", label: "네이버 검색광고 API Key", required: false, scope: "private", group: "naver" },
  { key: "NAVER_SEARCHAD_SECRET_KEY", label: "네이버 검색광고 Secret Key", required: false, scope: "private", group: "naver" },
  { key: "NAVER_SEARCHAD_CUSTOMER_ID", label: "네이버 검색광고 Customer ID", required: false, scope: "private", group: "naver" },

  // ── PostHog ──
  { key: "NEXT_PUBLIC_POSTHOG_TOKEN", label: "PostHog 공개 토큰", required: false, scope: "public", group: "posthog" },
  { key: "NEXT_PUBLIC_POSTHOG_HOST", label: "PostHog 수집 호스트", required: false, scope: "public", group: "posthog" },
  { key: "NEXT_PUBLIC_POSTHOG_UI_HOST", label: "PostHog UI 호스트", required: false, scope: "public", group: "posthog" },
  { key: "POSTHOG_PROJECT_ID", label: "PostHog Project ID", required: false, scope: "private", group: "posthog" },
  { key: "POSTHOG_API_KEY", label: "PostHog API Key", required: false, scope: "private", group: "posthog" },
  { key: "POSTHOG_BASE_URL", label: "PostHog App URL", required: false, scope: "private", group: "posthog" },

  // ── Sentry ──
  { key: "NEXT_PUBLIC_SENTRY_DSN", label: "Sentry DSN", required: true, scope: "public", group: "sentry" },
  { key: "NEXT_PUBLIC_SENTRY_ENVIRONMENT", label: "Sentry 공개 환경명", required: false, scope: "public", group: "sentry" },
  { key: "NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE", label: "Sentry Trace Sample Rate", required: false, scope: "public", group: "sentry" },
  { key: "SENTRY_ENVIRONMENT", label: "Sentry 서버 환경명", required: false, scope: "private", group: "sentry" },
  { key: "SENTRY_ORG", label: "Sentry Org Slug", required: true, scope: "private", group: "sentry" },
  { key: "SENTRY_PROJECT", label: "Sentry Project Slug", required: true, scope: "private", group: "sentry" },
  { key: "SENTRY_AUTH_TOKEN", label: "Sentry Auth Token", required: true, scope: "private", group: "sentry" },

  // ── 카카오 ──
  { key: "NEXT_PUBLIC_KAKAO_MAP_APP_KEY", label: "카카오맵 앱 키", required: true, scope: "public", group: "kakao" },

  // ── 인프라 ──
  { key: "CRON_SECRET", label: "Vercel Cron 인증 토큰", required: true, scope: "private", group: "infra" },
  { key: "INDEXNOW_KEY", label: "IndexNow API Key", required: false, scope: "private", group: "infra" },
];
