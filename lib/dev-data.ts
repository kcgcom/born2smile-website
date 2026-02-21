// =============================================================
// 정적 개발 데이터 (수동 관리)
// 빌드 매니페스트와 별도로, 코드 변경 시 수동 업데이트 필요
// =============================================================

// -------------------------------------------------------------
// Next.js 설정 요약
// -------------------------------------------------------------

export const NEXTJS_CONFIG = {
  output: "standalone",
  framework: "Next.js 16 (App Router)",
  deployment: "Firebase App Hosting (Cloud Run + Cloud CDN)",
  cloudRun: {
    minInstances: 0,
    maxInstances: 4,
    concurrency: 80,
    cpu: 1,
    memoryMiB: 512,
  },
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
// Firestore 컬렉션 구조
// -------------------------------------------------------------

export interface FirestoreCollection {
  name: string;
  docId: string;
  access: string;
  purpose: string;
}

export const FIRESTORE_COLLECTIONS: FirestoreCollection[] = [
  {
    name: "blog-posts",
    docId: "{slug}",
    access: "Admin SDK 전용",
    purpose: "블로그 포스트 (80개)",
  },
  {
    name: "blog-likes",
    docId: "{slug}",
    access: "클라이언트 read/write",
    purpose: "좋아요 카운트 + 사용자 UUID",
  },
  {
    name: "site-config",
    docId: "links | clinic | hours | schedule",
    access: "Admin SDK 전용",
    purpose: "사이트 설정 + 발행 스케줄",
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
    path: "/api/dev/env-status",
    methods: ["GET"],
    auth: true,
    description: "환경변수 설정 상태",
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
  { key: "GA4_SUMMARY", seconds: 3600, label: "1시간" },
  { key: "GA4_DAILY", seconds: 21600, label: "6시간" },
  { key: "SEARCH_CONSOLE", seconds: 21600, label: "6시간" },
  { key: "BLOG_LIKES", seconds: 300, label: "5분" },
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
  { key: "NEXT_PUBLIC_KAKAO_MAP_APP_KEY", label: "카카오맵 앱 키", required: true, scope: "public" },
  { key: "NEXT_PUBLIC_FIREBASE_API_KEY", label: "Firebase API Key", required: true, scope: "public" },
  { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", label: "Firebase Project ID (기본: seoul-born2smile)", required: true, scope: "public" },
  { key: "NEXT_PUBLIC_ADMIN_EMAILS", label: "관리자 이메일", required: true, scope: "public" },
  { key: "GA4_PROPERTY_ID", label: "GA4 속성 ID", required: false, scope: "private" },
  { key: "SEARCH_CONSOLE_SITE_URL", label: "Search Console URL", required: false, scope: "private" },
  { key: "GOOGLE_SERVICE_ACCOUNT_KEY", label: "서비스 계정 키", required: false, scope: "private" },
];
