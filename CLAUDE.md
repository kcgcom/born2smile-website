# CLAUDE.md

## Project Overview

Dental clinic website for "서울본치과" (Seoul Born Dental Clinic) in Gimpo, South Korea. Full-stack Next.js app deployed to Firebase App Hosting (Cloud Build + Cloud Run + Cloud CDN).

- **Site URL**: `https://www.born2smile.co.kr`
- **Firebase Site**: `seoul-born2smile` (Firebase Hosting redirects to App Hosting)

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router, React 19.2.3, TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 (inline `@theme` in `globals.css`, no separate `tailwind.config` file), CSS custom properties
- **Animation**: CSS @keyframes + IntersectionObserver (`components/ui/Motion.tsx` provides `<FadeIn>`, `<StaggerContainer>`, `<StaggerItem>`)
- **Icons**: Lucide React
- **Maps**: Kakao Maps SDK (async loaded)
- **Charts**: Recharts 2 (dynamic import, 트래픽/검색/블로그 탭 인터랙티브 차트)
- **Validation**: Zod v4 (`zod/v4`, 블로그 CRUD + 사이트 설정 API 입력 검증)
- **Database**: Firebase Firestore (블로그 포스트 저장소 + 좋아요 + 사이트 설정)
- **Auth**: Firebase Auth (Google 로그인, 관리자 대시보드 전용) + Firebase Admin SDK (서버 사이드 토큰 검증)
- **Analytics**: Google Analytics 4 Data API (`@google-analytics/data`), Google Search Console API (`googleapis`), Naver DataLab API (검색 트렌드), Naver Search Ads API (절대 검색량)
- **Package Manager**: pnpm
- **Deployment**: Firebase App Hosting (`output: "standalone"` in `next.config.ts`, Cloud Run 기반)

## Getting Started

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_KAKAO_MAP_APP_KEY 입력
pnpm dev                      # http://localhost:3000
```

## Commands

- `pnpm dev` — Start dev server (블로그 메타데이터 + 개발 매니페스트 자동 생성 후 실행)
- `pnpm build` — Production build (블로그 메타데이터 + 개발 매니페스트 자동 생성 후 빌드, standalone output to `.next/`)
- `pnpm start` — Start production Next.js server (빌드 후 로컬 프로덕션 테스트)
- `pnpm generate-blog-meta` — 블로그 메타데이터 수동 재생성 (`lib/blog/generated/posts-meta.ts`)
- `pnpm generate-dev-manifest` — 개발 대시보드 매니페스트 수동 재생성 (`lib/dev/generated/dev-manifest.ts`)
- `pnpm test:e2e` — Playwright 스모크 테스트 실행 (Chromium, 7개 정적 페이지 렌더링 검증)
- `pnpm test:e2e:ui` — Playwright UI 모드로 디버깅
- `pnpm lint` — Run ESLint
- `pnpm deploy` — Deploy to Firebase App Hosting (빌드는 Cloud Build에서 원격 실행)
- `pnpm submit-indexnow` — 오늘 발행된 블로그 포스트 URL을 IndexNow에 제출
- `pnpm submit-indexnow:all` — 전체 사이트 URL을 IndexNow에 제출 (초기 설정 또는 전체 재인덱싱 시)

## No Test Suite

There is no testing framework configured. No test commands are available.

## Project Structure

```
app/                          # Next.js App Router pages
  layout.tsx                  # Root layout (header, footer, floating CTA, admin floating button, JSON-LD, GA 관리자 트래픽 제외)
  page.tsx                    # Homepage (hero, values, treatments, doctor, map, CTA)
  globals.css                 # Design tokens, @theme inline, utility classes
  favicon.ico                 # Favicon
  robots.ts                   # robots.txt generation (force-static)
  sitemap.ts                  # Sitemap XML generation (force-static, includes blog posts)
  error.tsx                   # 에러 페이지 (한국어, 다시 시도 + 전화 상담)
  not-found.tsx               # 404 페이지 (한국어, 홈으로 + 전화 상담)
  about/page.tsx              # Clinic info, doctor bio, facility, hours
  treatments/
    page.tsx                  # Treatment listing (6 cards)
    [slug]/page.tsx           # Individual treatment detail (generateStaticParams, 지역 SEO 메타데이터, HowTo 스키마, 관련 진료 교차 링크)
    [slug]/loading.tsx        # Suspense loading boundary
  blog/
    page.tsx                  # Blog hub (delegates to BlogContent)
    [category]/page.tsx       # Category hub landing page (7 categories, generateStaticParams)
    [category]/[slug]/page.tsx # Blog post detail (generateStaticParams, category consistency guard, 맥락형 CTA, 목차 TOC)
    [category]/[slug]/loading.tsx # Suspense loading boundary
    redirect/[slug]/page.tsx  # Old URL redirect handler (Firestore lookup → permanentRedirect)
  faq/page.tsx                # 전체 FAQ 통합 페이지 (6개 진료 과목 FAQ, FAQPage JSON-LD)
  admin/
    layout.tsx                # Admin layout (noindex, Header/Footer CSS 숨김)
    (dashboard)/
      layout.tsx              # AuthGuard wrapper
      page.tsx                # Dashboard main — 6탭 컨테이너 ("use client")
      components/
        AdminTabs.tsx         # 탭 네비게이션 (개발/트래픽/검색·SEO/트렌드/블로그/설정, 아이콘+반응형 텍스트)
        TrafficTab.tsx        # 트래픽 탭 (Recharts 바/파이/영역 차트, GA4 Data API)
        SearchTab.tsx         # 검색/SEO 탭 (Recharts 바/라인 차트, Search Console API + 네이버 DataLab 트렌드)
        TrendTab.tsx          # 트렌드 분석 탭 (네이버 DataLab 트렌드 + 검색광고 절대 검색량, 콘텐츠 갭 분석, 블로그 주제 추천, 기간: 1개월/3개월/1년/3년/10년, 모바일 2줄 카드 레이아웃)
        BlogTab.tsx           # 블로그 관리 탭 (CRUD, 발행 예약, 검색/필터/정렬, 좋아요 집계, 카테고리 파이차트, 발행 스케줄)
        BlogEditor.tsx        # 블로그 포스트 편집기 (임시저장/발행 유지, Zod 검증)
        SettingsTab.tsx       # 설정 탭 (SNS 링크/병원 정보/진료시간/빠른 링크)
        StatCard.tsx          # 통계 카드 (아이콘 + 값 + 라벨)
        ConfigRow.tsx         # 설정 행 (라벨 + 값 표시)
        MetricCard.tsx        # 지표 카드 (값 + 증감률)
        DataTable.tsx         # 범용 데이터 테이블 (정렬/검색 기능)
        AdminErrorState.tsx   # 공통 에러 상태 UI
        AdminLoadingSkeleton.tsx # 공통 로딩 스켈레톤 UI
        PeriodSelector.tsx    # 기간 선택 버튼 그룹
        DevTab.tsx            # 개발 탭 컨테이너 (서브탭: 현황/성능/레퍼런스)
        ProjectTab.tsx        # 개발>현황 서브탭 (개선 항목 진행률, 환경변수 상태, 기술 스택, 사이트 설정 상태)
        PerformanceTab.tsx    # 개발>성능 서브탭 (PageSpeed Insights — Lighthouse 점수, Core Web Vitals, 개선 기회)
        ReferenceTab.tsx      # 개발>레퍼런스 서브탭 (의존성, TS/ESLint, 라우트, 인프라, Firestore, API/캐시 — 아코디언 UI)
        useAdminApi.ts        # Admin API 데이터 페칭 훅 (SWR 패턴, AbortController로 race condition 방지)
    login/
      page.tsx                # Google login page ("use client")
  api/
    dev/
      env-status/
        route.ts              # 환경변수 상태 API (GET, Admin 인증)
      pagespeed/
        route.ts              # PageSpeed Insights API 프록시 (GET, Admin 인증, 6시간 캐시)
    admin/
      _lib/
        auth.ts               # Admin API 인증 미들웨어 (Firebase Admin SDK)
        cache.ts              # unstable_cache 래퍼 + TTL 상수 (GA4 1h, SC/DataLab/PSI 6h, 검색광고 24h, 좋아요 5m)
      analytics/
        route.ts              # GA4 트래픽 데이터 API (GET)
      search-console/
        route.ts              # Search Console 검색 성과 API (GET)
      naver-datalab/
        route.ts              # 네이버 DataLab 검색 트렌드 API (GET)
        overview/
          route.ts            # 트렌드 개요 API — 카테고리별 트렌드 + 콘텐츠 갭 + 주제 추천 (GET)
        category/
          [slug]/route.ts     # 카테고리별 상세 트렌드 API (GET)
      naver-searchad/
        volume/
          route.ts            # 네이버 검색광고 키워드 검색량 API (GET, 24시간 캐시)
      blog-likes/
        route.ts              # Firestore 좋아요 집계 API (GET)
      blog-posts/
        route.ts              # 블로그 포스트 목록/생성 API (GET/POST, Zod 검증)
        [slug]/route.ts       # 블로그 포스트 상세/수정/삭제 API (GET/PUT/DELETE)
      site-config/
        [type]/route.ts       # 사이트 설정 조회/수정 API (GET/PUT, type: links|clinic|hours)
  contact/
    layout.tsx                # Contact layout wrapper with metadata
    page.tsx                  # 전화 상담 안내 + 오시는 길 ("use client")
components/
  blog/
    BlogContent.tsx           # Blog listing/display component ("use client")
    BlogShareButton.tsx       # Share button with Web Share API + clipboard fallback ("use client")
    TableOfContents.tsx       # 블로그 목차 자동 생성 ("use client", IntersectionObserver 스크롤 스파이, 모바일 접기/펼치기)
    LikeButton.tsx            # Firestore 좋아요 버튼 ("use client")
  admin/
    AuthGuard.tsx             # Firebase Auth guard ("use client")
    DashboardHeader.tsx       # 관리자 대시보드 헤더 ("use client")
    AdminFloatingButton.tsx   # 관리자 플로팅 대시보드 버튼 ("use client", localStorage 게이트 + 동적 Firebase import)
    AdminEditButton.tsx       # 관리자 인라인 편집 버튼 — 라벨 포함 ("use client")
    AdminEditIcon.tsx         # 관리자 인라인 편집 아이콘 — 아이콘만 ("use client")
    AdminPublishButton.tsx    # 관리자 발행 예약 버튼 — draft 포스트 상세 페이지용 ("use client")
    AdminSettingsLink.tsx     # 관리자 설정 편집 링크 ("use client", localStorage 게이트 + 동적 Firebase import)
    PublishPopup.tsx          # 발행 팝업 공유 컴포넌트 — BlogTab/AdminPublishButton/AdminDraftBar 3곳 공유 ("use client")
  layout/                     # Header, Footer, FloatingCTA
  ui/                         # Motion (animations), KakaoMap, CTABanner, FaqAccordion
hooks/
  useAdminAuth.ts            # 공유 관리자 인증 훅 (Firebase onAuthStateChanged + isAdminEmail + GA 관리자 제외 플래그)
  usePublishPopup.ts         # 발행 팝업 상태 관리 + 추천 날짜 계산 훅 (AdminPublishButton/AdminDraftBar 공유)
lib/
  constants.ts               # Single source of truth: clinic info, hours, treatments, nav, SEO
  treatments.ts              # Treatment detail descriptions, steps, advantages, FAQ (치과 선택 FAQ 포함), RELATED_TREATMENTS 교차 링크 매핑
  date.ts                    # KST 날짜 유틸리티 (getTodayKST)
  format.ts                  # 날짜 포맷 유틸리티 (formatDate)
  firebase.ts                # Firebase 클라이언트 초기화 (Firestore + Auth)
  admin-auth.ts              # 관리자 인증 모듈 (Google 로그인, 이메일 화이트리스트)
  admin-data.ts              # 관리자 대시보드 데이터 (개선 항목, 블로그 통계, 사이트 설정)
  admin-utils.ts             # 관리자 공통 유틸리티 (calcChange)
  firebase-admin.ts          # Firebase Admin SDK 싱글톤 (ADC 우선, JSON key 폴백)
  admin-analytics.ts         # GA4 Data API 클라이언트 (KST 기간 계산, 기간 비교)
  admin-search-console.ts    # Search Console API 클라이언트 (3일 지연 오프셋, dynamic import)
  admin-naver-datalab.ts     # 네이버 DataLab 검색 트렌드 API 클라이언트 (5개 키워드 그룹)
  admin-naver-datalab-keywords.ts # 카테고리별 키워드 정의 (8카테고리×5서브그룹, volumeKeywords, TopicAngles)
  admin-naver-searchad.ts    # 네이버 검색광고 API 클라이언트 (HMAC-SHA256, lazy env getter, 공백 정규화, 순차 배치 호출, 배치 간 중복 제거)
  trend-analysis.ts          # 트렌드 분석 엔진 (analyzeTrend, analyzeContentGap, generateTopicSuggestions)
  blog-firestore.ts          # Firestore 블로그 CRUD (Admin SDK, unstable_cache, ISR revalidate)
  blog-validation.ts         # Zod 검증 스키마 (블로그 포스트 + 사이트 설정 + 발행 스케줄)
  dev-data.ts                # 개발 대시보드 정적 데이터 (Next.js 설정, ESLint, Firestore, API, 캐시, 환경변수)
  dev/
    generated/               # 자동 생성 (gitignored) — pnpm generate-dev-manifest
      dev-manifest.ts         # DEV_MANIFEST (의존성, 라우트, 프로젝트 통계, TS/Firestore 설정)
  site-config-firestore.ts   # Firestore 사이트 설정 CRUD (links, clinic, hours, schedule)
  fonts.ts                   # Local font config (Pretendard, Noto Serif KR)
  jsonld.ts                  # JSON-LD generators: clinic, treatment, FAQ, blog post, breadcrumb, collection
  blog/
    types.ts                 # BlogPost, BlogPostMeta 인터페이스, 카테고리/태그 상수
    category-slugs.ts        # 카테고리 ↔ URL 슬러그 매핑 (single source of truth)
    category-colors.ts       # 카테고리별 색상 매핑 (목록/상세 공유)
    index.ts                 # re-export + 진료↔블로그 매핑 (TREATMENT_CATEGORY_MAP)
    generated/               # 자동 생성 (gitignored) — pnpm generate-blog-meta
      posts-meta.ts          # BLOG_POSTS_META 배열 (포스트 파일에서 자동 추출, 폴백용)
    posts/                   # 개별 포스트 파일 (80개, slug.ts 형식) — 파일 기반 폴백
public/
  fonts/                     # Local font files (woff2)
  images/                    # Clinic and doctor images
  BingSiteAuth.xml           # Bing webmaster verification
  naver*.html                # Naver webmaster verification
  7d01a83d...*.txt           # IndexNow API 키 파일
docs/
  blog-writing-guide.md      # 블로그 작성 가이드 (브랜드 보이스, 문체, 용어 통일표, SEO)
  firestore-architecture.md  # Firestore 컬렉션/인덱스/보안규칙/캐싱 구조
  blog-workflow.md           # 블로그 발행 워크플로우 (초안→예약→발행)
  environment-variables.md   # 환경변수 목록 및 설정 가이드
  todo.md                    # 미완료 항목 및 개선 과제
scripts/
  generate-blog-meta.ts      # 빌드 시 포스트 파일에서 메타데이터 자동 추출 스크립트
  generate-dev-manifest.ts   # 빌드 시 개발 대시보드 매니페스트 생성 스크립트
  submit-indexnow.mjs        # IndexNow URL 제출 스크립트 (Node.js 내장 모듈만 사용)
  migrate-blog-to-firestore.ts # 파일 → Firestore 블로그 마이그레이션 (1회성)
  verify-migration.ts        # 마이그레이션 검증 스크립트
  deploy-firestore.ts        # Firestore 인덱스/규칙 REST API 배포
middleware.ts                 # 구형 블로그 URL 리다이렉트 (Edge Runtime, /blog/[slug] → /blog/redirect/[slug] rewrite)
hosting-redirect/            # Firebase Hosting redirect (serves verification files)
.github/
  workflows/
    scheduled-rebuild.yml    # 매일 KST 00:05 자동 재빌드 (예약 포스트 발행용) + IndexNow 제출
.firebaserc                  # Firebase project alias config (default: seoul-born2smile)
apphosting.yaml              # Firebase App Hosting runtime config
firebase.json                # Firebase project config (Hosting redirect + App Hosting)
firestore.rules              # Firestore security rules (blog-likes 컬렉션 read/write 규칙)
postcss.config.mjs           # PostCSS with @tailwindcss/postcss
pnpm-workspace.yaml          # pnpm workspace config
```

## Architecture

- **Standalone mode**: `output: "standalone"` — Cloud Run에서 Node.js 서버로 실행. SSR, API Routes, Middleware, ISR, `next/image` 최적화 모두 사용 가능.
- **Static + Dynamic**: `generateStaticParams()`로 빌드 시점 정적 생성 + 필요 시 SSR/ISR 혼용 가능.
- **Data centralization**: `lib/constants.ts` is the single source of truth for clinic name, address, hours, doctor info, treatments, and SEO data. Nav items (`NAV_ITEMS`) are defined in `lib/constants.ts` and imported by `components/layout/Header.tsx`. Update data in these centralized locations, not in individual pages.
- **Server/Client split**: Pages default to server components. Components needing interactivity (`"use client"`): Header, FloatingCTA, KakaoMap, BlogContent, BlogShareButton, LikeButton, Contact form, Motion wrappers, Admin convenience components (DashboardHeader, AdminFloatingButton, AdminEditButton, AdminEditIcon, AdminPublishButton, AdminSettingsLink). Footer는 서버 컴포넌트 (클라이언트 컴포넌트 AdminSettingsLink를 island로 포함). 루트 레이아웃의 Admin 컴포넌트(`AdminFloatingButton`, `AdminSettingsLink`)는 `localStorage` 게이트 + `import()` 동적 Firebase 로드로 비관리자 방문자에게 Firebase SDK 미전송.
- **Treatment↔Blog cross-referencing**: `lib/blog/index.ts`의 `TREATMENT_CATEGORY_MAP`으로 진료 과목 ID와 블로그 카테고리를 매핑. `getRelatedBlogPosts(treatmentId)` / `getRelatedTreatmentId(category)` 헬퍼 함수 제공.
  ```
  implant → 임플란트, orthodontics → 치아교정, prosthetics → 보철치료,
  pediatric → 소아치료, restorative → 보존치료, scaling → 예방관리
  ```
  `"건강상식"` 카테고리는 특정 진료 과목에 매핑되지 않음 (일반 건강 정보).
- **Blog URL structure**: `/blog/[category]/[slug]` 계층 구조. 카테고리 허브 7개 (`/blog/implant`, `/blog/orthodontics` 등). 카테고리↔URL 슬러그 매핑은 `lib/blog/category-slugs.ts`가 single source of truth. 구형 `/blog/[slug]` URL은 `middleware.ts`에서 `/blog/redirect/[slug]`로 rewrite → Firestore 조회 후 308 permanentRedirect.
- **SEO**: JSON-LD schemas (`lib/jsonld.ts`), Next.js Metadata API, sitemap, robots.txt. All content is Korean-language and SEO-optimized for local dental search terms.

### Rendering Strategy

| Page | Rendering | Notes |
|------|-----------|-------|
| `/` | SSG | Static at build time |
| `/about` | SSG | Static |
| `/treatments` | SSG | Static |
| `/treatments/[slug]` | SSG | `generateStaticParams()` for 6 slugs |
| `/blog` | SSG | Static (metadata from Firestore, 파일 폴백) |
| `/blog/[category]` | SSG + ISR | 카테고리 허브 페이지 (7개), `generateStaticParams()` + `revalidate: 3600` |
| `/blog/[category]/[slug]` | SSG + ISR | `generateStaticParams()` + `revalidate: 3600` (1시간) |
| `/blog/redirect/[slug]` | Dynamic | 구형 URL 리다이렉트 (Firestore 조회 → 308 permanentRedirect) |
| `/faq` | SSG | 전체 FAQ 통합 페이지 (6개 진료 과목, FAQPage JSON-LD) |
| `/contact` | Client-side | `"use client"` 전화 상담 안내 페이지 |
| `/admin` | Client-side | 관리자 대시보드 6탭 (AuthGuard 보호, `"use client"`) |
| `/admin/login` | Client-side | Google 로그인 페이지 (`"use client"`) |
| `/api/admin/*` | Server-side | Admin API Routes (GA4, SC, blog-likes, blog-posts CRUD, site-config) |
| `/api/dev/env-status` | Server-side | 환경변수 상태 API (Admin 인증) |
| `/api/dev/pagespeed` | Server-side | PageSpeed Insights API 프록시 (Admin 인증, 6시간 캐시) |
| `/sitemap.xml` | Force Static | `export const dynamic = "force-static"` |
| `/robots.txt` | Force Static | `export const dynamic = "force-static"` |

### Firestore 데이터 아키텍처

상세 내용은 [`docs/firestore-architecture.md`](docs/firestore-architecture.md) 참조. 4개 컬렉션 (`blog-posts`, `blog-likes`, `site-config`, `api-cache`), 복합 인덱스 3개, Firestore→파일 자동 폴백, `unstable_cache` + 2-tier 캐싱.

### 블로그 발행 워크플로우

상세 내용은 [`docs/blog-workflow.md`](docs/blog-workflow.md) 참조. 초안→발행 예약 2단계, 스케줄 기반 날짜 추천, `date <= today` 필터링, 일별 시드 셔플, `BlogPostSection[]` 콘텐츠 구조.

### 블로그 작성 가이드라인

블로그 포스트 작성 시 `docs/blog-writing-guide.md` 참조 (브랜드 보이스, 문체 원칙, 글 구조, 섹션 전개, 전문 용어 통일표, SEO 검색 표현, 연결 표현).

### Font System

`next/font/local`로 로컬 폰트를 로드하고 CSS 변수로 연결:

| Font | CSS Variable | Usage | Loading |
|------|-------------|-------|---------|
| Pretendard Variable (KS X 1001 서브셋, 456KB) | `--font-pretendard` | 본문 기본 (`font-sans`) | preload, `swap` |
| Noto Serif KR (KS X 1001 서브셋, 400: 322KB / 700: 331KB) | `--font-noto-serif` | 헤드라인 (`font-serif`, `.font-headline`) | no preload, `swap` |
| Gowun Batang (KS X 1001 서브셋, 700 only, 172KB) | `--font-gowun-batang` | 인사말 편지 (`.font-greeting`) | no preload, `optional` |

`lib/fonts.ts`에서 설정 → `app/layout.tsx`의 `<html>` 태그에 variable 적용 → `globals.css`의 `@theme inline`에서 Tailwind와 연결.

### Design Tokens & Utility Classes

블루(전문성/신뢰) + 골드(따뜻함/프리미엄) 듀얼 컬러 시스템. 상세 토큰은 `app/globals.css` 참조.

커스텀 유틸리티 클래스:

- `.section-padding` — 섹션 공통 패딩 (`px-4 py-16` ~ `lg:px-8 lg:py-32`)
- `.container-narrow` — 최대 너비 컨테이너 (`max-w-6xl mx-auto`)
- `.font-headline` — 세리프 헤드라인 폰트 (Noto Serif KR)
- `.font-greeting` — 인사말 편지 폰트 (Gowun Batang)
- `.greeting-letter` — 편지 스타일 카드 (그라데이션 배경, 라운드 코너)

### Firebase 인프라

- **클라이언트** (`lib/firebase.ts`): 싱글톤, `isFirebaseConfigured`로 graceful degradation, Auth lazy getter
- **Admin SDK** (`lib/firebase-admin.ts`): 싱글톤, ADC 우선 → `GOOGLE_SERVICE_ACCOUNT_KEY` 폴백
- **관리자 인증** (`lib/admin-auth.ts`): 이메일 화이트리스트 (`NEXT_PUBLIC_ADMIN_EMAILS`), Google 로그인
- **AuthGuard** (`components/admin/AuthGuard.tsx`): `onAuthStateChanged` → 미로그인 리다이렉트, 비관리자 차단

### 관리자 대시보드

**관리자 대시보드 (`/admin`)** — 6탭 구조 (`?tab=` query param, 기본 탭: 개발): 개발(서브탭: 현황/성능/레퍼런스), 트래픽(GA4), 검색/SEO(SC), 트렌드(DataLab+검색광고+갭분석), 블로그(CRUD+발행+파이차트+스케줄), 설정(편집+빠른링크).

- **API 공통**: Firebase Admin ID 토큰 검증, `unstable_cache` TTL, `Cache-Control: private, no-store`
- **API 엔드포인트**: `/api/admin/analytics`, `/search-console`, `/naver-datalab` (트렌드), `/naver-datalab/overview` (개요+갭분석), `/naver-datalab/category/[slug]` (카테고리별), `/naver-searchad/volume` (검색량), `/blog-likes`, `/blog-posts` (CRUD), `/site-config/[type]` (links|clinic|hours|schedule)
- **편의 기능**: `AdminFloatingButton`(좌하단 `bg-gray-600`), `AdminEditButton`/`AdminPublishButton`/`AdminEditIcon`(인라인 편집→딥링크), `useAdminAuth` 공유 훅. `AdminFloatingButton`과 `AdminSettingsLink`는 루트 레이아웃에서 로드되므로 `localStorage("born2smile-admin")` 게이트 + `import()` 동적 Firebase 로드 패턴을 사용하여 비관리자 방문자의 번들에서 Firebase SDK(~500KiB)를 제거
- **GA 관리자 트래픽 제외**: `useAdminAuth`가 관리자 로그인 시 `localStorage("born2smile-admin")` 설정 → `layout.tsx` 인라인 스크립트가 `window["ga-disable-G-3ZDMMFGP6Z"]=true`로 GA 추적 비활성화
- **개발 탭** (`?tab=dev`): 서브탭 3개 — 현황(`sub=project`, 개선 진행률+환경변수+기술 스택), 성능(`sub=perf`, PageSpeed Insights), 레퍼런스(`sub=ref`, 아코디언 6섹션). 데이터 소스: 빌드 타임 매니페스트 (`lib/dev/generated/dev-manifest.ts`) + 정적 데이터 (`lib/dev-data.ts`). 환경변수 상태는 `/api/dev/env-status`, PageSpeed는 `/api/dev/pagespeed` (`PAGESPEED_API_KEY` 필수, 6시간 캐시). 매니페스트는 `pnpm dev`/`pnpm build` 시 자동 생성

## Common Tasks

### 진료 과목 추가

1. `lib/constants.ts` → `TREATMENTS` 배열에 항목 추가 (`id`, `name`, `shortDesc`, `icon`, `href`)
2. `lib/treatments.ts` → `TREATMENT_DETAILS`에 상세 데이터 추가 (`TreatmentDetail` 인터페이스: `id`, `name`, `subtitle`, `description`, `steps[]`, `advantages[]`, `faq[]`)
3. `app/treatments/[slug]/page.tsx`의 `generateStaticParams()`가 자동으로 새 페이지 생성

### 블로그 포스트 추가

**방법 1: 관리자 대시보드 (권장)**

1. `/admin` → 블로그 탭 → "새 포스트 작성" 버튼
2. BlogEditor에서 제목, 부제, 요약, 카테고리, 태그, 본문 섹션 입력
3. "임시저장" 클릭 → Firestore에 `published: false` 상태로 저장
4. 블로그 탭 포스트 목록에서 해당 포스트의 "발행" 버튼 클릭
5. PublishPopup에서 스케줄 기반 추천 날짜 확인/변경 → "발행 예약" 클릭
6. `published: true` + 선택한 날짜로 업데이트, ISR revalidate로 사이트 반영

**방법 2: 파일 생성 (폴백/대량 추가용)**

1. `lib/blog/posts/` → 새 파일 생성 (`slug-name.ts`, `BlogPost` 인터페이스 준수)
   - `import type { BlogPost } from "../types";` + `export const post: BlogPost = { ... };`
   - `title`: 훅(호기심 유발) 문구, `subtitle`: 설명적 부제 — 2줄 구조로 표시
2. `pnpm dev` 또는 `pnpm build` 실행 시 메타데이터가 자동 생성됨
   - 수동 재생성: `pnpm generate-blog-meta`
3. Firestore에도 반영 필요 시: `GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa-key.json npx tsx scripts/migrate-blog-to-firestore.ts`

**공통 사항:**
- 카테고리(1개 선택): `"예방관리" | "보존치료" | "보철치료" | "임플란트" | "치아교정" | "소아치료" | "건강상식"`
- 태그(복수 선택): `BLOG_TAGS` 배열(`lib/blog/types.ts`)에 정의된 7개 태그 중 선택
   - 유형 태그: `"치료후관리"`, `"생활습관"`, `"팩트체크"`, `"증상가이드"`, `"비교가이드"`
   - 대상 태그: `"임산부"`, `"시니어"`
- 새 카테고리 추가 시 `lib/blog/types.ts`의 `BLOG_CATEGORIES`와 `BlogCategoryValue` 타입도 함께 수정
- 새 태그 추가 시 `lib/blog/types.ts`의 `BLOG_TAGS` 배열에 추가
- 블로그 목록은 접속 시마다 랜덤 순서로 표시됨 (클라이언트 측 셔플, 12개씩 페이지네이션)

### 병원 정보 수정

**방법 1: 관리자 대시보드** — `/admin` → 설정 탭에서 SNS 링크, 병원 정보, 진료시간 실시간 편집 (Firestore `site-config` 컬렉션에 저장). 발행 스케줄은 블로그 탭에서 편집.

**방법 2: 코드 수정** — `lib/constants.ts`의 해당 상수만 수정하면 사이트 전체에 반영:

- `CLINIC` — 병원명, 주소, 전화번호, 대표자
- `DOCTORS` — 의료진 정보 (학력, 자격, 학회, 현직)
- `HOURS` — 진료시간 (요일별 시간, 점심시간, 휴진일)
- `TREATMENTS` — 진료 과목 목록 (id, name, shortDesc, icon, href)
- `SEO` — 메타데이터, 키워드 (23개 로컬 SEO 키워드)
- `LINKS` — SNS/외부 링크 (카카오, 인스타, 네이버, 지도)
- `GOOGLE_REVIEW` — Google Place ID 및 리뷰 작성 URL (getter)
- `NAVER_REVIEW` — 네이버 플레이스 ID 및 리뷰 작성 URL (getter)
- `REVIEWS` — 환자 후기 배열 (`Review[]`: name, rating, text, source, date)
- `MAP` — 네이버 지도 좌표 및 줌 레벨
- `BASE_URL` — 사이트 기본 URL

### JSON-LD 구조화 데이터

JSON-LD 구조화 데이터는 `lib/jsonld.ts`에서 6종 생성 (Clinic, Treatment, HowTo, FAQ, BlogPost, Breadcrumb).

## Code Conventions

- 2-space indentation
- Components: PascalCase (`Header.tsx`, `KakaoMap.tsx`)
- Constants: UPPER_SNAKE_CASE (`NAV_ITEMS`, `CLINIC`)
- Variables/functions: camelCase
- CSS variables: `--kebab-case`
- TypeScript: `interface` for props, explicit type annotations, strict mode enabled
- Path alias: `@/*` maps to project root
- Accessibility: semantic HTML, ARIA labels, skip links, `prefers-reduced-motion` support, keyboard focus styles (`2px solid primary`)

### Commit Messages

한국어로 작성, conventional commit 접두사 사용:

```
feat: 카카오맵 연동 - 주소 기반 자동 좌표 검색
fix: 반응형 및 접근성(a11y) 개선
docs: CLAUDE.md 파일 추가
```

### Linting

ESLint 9 flat config (`eslint.config.mjs`):

- `eslint-config-next/core-web-vitals` — Core Web Vitals 규칙
- `eslint-config-next/typescript` — TypeScript 규칙
- Ignore: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Deployment

Firebase App Hosting으로 배포 (Cloud Build → Cloud Run + Cloud CDN):

- `apphosting.yaml` — Cloud Run 런타임 설정:
  - `minInstances: 0` (scale to zero)
  - `maxInstances: 4`
  - `concurrency: 80`
  - `cpu: 1`, `memoryMiB: 512`
- `firebase.json` — Firebase Hosting이 301 redirect로 App Hosting URL로 전달
- `firestore.rules` — Firestore 보안 규칙: `blog-likes/{slug}` 클라이언트 read/write 허용 (count, users 필드 검증), `blog-posts` + `site-config`는 Admin SDK 전용 (클라이언트 접근 차단), 나머지 전체 차단
- `firestore.indexes.json` — 복합 인덱스 3개 정의 (published+date, category+date, published+category+date)
- 빌드는 Cloud Build에서 원격 실행 → 로컬 `next build` 불필요
- 정적 에셋(`.next/static`, `public/`)은 Cloud CDN에서 캐싱
- SSR/API Routes는 Cloud Run에서 처리, scale-to-zero 지원
- GitHub 연동 시 push → 자동 배포 가능

### 예약 발행 자동 재빌드

GitHub Actions 워크플로우(`.github/workflows/scheduled-rebuild.yml`)가 매일 KST 00:05 (UTC 15:05)에 빈 커밋을 push하여 Firebase App Hosting 재빌드를 트리거. 이를 통해 `date` 필드가 미래 날짜인 블로그 포스트가 해당 날짜에 자동 발행됨. `workflow_dispatch`로 수동 실행도 가능.

재빌드 커밋 push 후, `scripts/submit-indexnow.mjs`가 실행되어 오늘 발행된 포스트 URL을 IndexNow API에 자동 제출.

### IndexNow

[IndexNow](https://www.indexnow.org/)를 통해 새 콘텐츠를 검색엔진(Bing, Naver, Yandex 등)에 즉시 알림:

- **API 키 파일**: `public/7d01a83dddd13f9abf9186b937921369.txt`
- **제출 스크립트**: `scripts/submit-indexnow.mjs` (Node.js 내장 모듈만 사용, 의존성 설치 불필요)
- **자동 제출**: GitHub Actions 스케줄 재빌드 시 오늘 날짜 포스트를 자동 감지하여 제출
- **수동 제출**: `pnpm submit-indexnow` (오늘 발행분) / `pnpm submit-indexnow:all` (전체 URL)

## Environment Variables

상세 내용은 [`docs/environment-variables.md`](docs/environment-variables.md) 참조. 로컬 개발: `.env.example` → `.env.local`, 프로덕션: `apphosting.yaml` + Cloud Secret Manager.

## Known TODO Items

[`docs/todo.md`](docs/todo.md) 참조. `lib/admin-data.ts`의 `IMPROVEMENT_ITEMS`에서 전체 개선 항목 관리, 관리자 대시보드 개발>현황 서브탭에서 실시간 현황 확인 가능.
