# CLAUDE.md

## Project Overview

Dental clinic website for "서울본치과" (Seoul Born Dental Clinic) in Gimpo, South Korea. Full-stack Next.js app deployed to Vercel (Edge Network + Serverless Functions).

- **Site URL**: `https://www.born2smile.co.kr`

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router, React 19.2.3, TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 (inline `@theme` in `globals.css`, no separate `tailwind.config` file), CSS custom properties
- **Animation**: CSS @keyframes + IntersectionObserver (`components/ui/Motion.tsx` provides `<FadeIn>`, `<StaggerContainer>`, `<StaggerItem>`)
- **Icons**: Lucide React
- **Maps**: Kakao Maps SDK (async loaded)
- **Charts**: Recharts 2 (dynamic import, 트래픽/검색/블로그 탭 인터랙티브 차트)
- **Data Fetching**: SWR 2 (관리자 대시보드 클라이언트 캐시, 중복 제거, 호버 프리페치)
- **Validation**: Zod v4 (`zod/v4`, 블로그 CRUD + 사이트 설정 API 입력 검증)
- **Database**: Supabase (PostgreSQL with RLS) (블로그 포스트 저장소 + 좋아요 + 사이트 설정)
- **Auth**: Supabase Auth (Google OAuth, redirect-based, 관리자 대시보드 전용) + Supabase Admin (service_role key, 서버 사이드 RLS 바이패스)
- **Analytics**: Google Analytics 4 Data API (`@google-analytics/data`), Google Search Console API (`googleapis`), Naver DataLab API (검색 트렌드), Naver Search Ads API (절대 검색량) — 인사이트 탭에서 통합 분석
- **Package Manager**: pnpm
- **Deployment**: Vercel (Edge Network + Serverless Functions)
- **Production deploy policy**: `pnpm deploy` / `vercel --prod` 사용 금지. production은 `main` push로만 배포

## Getting Started

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_KAKAO_MAP_APP_KEY 입력
pnpm dev                      # http://localhost:3000
```

## Commands

- `pnpm dev` — Start dev server (블로그 snapshot + 메타데이터 + 개발 매니페스트 자동 생성 후 실행)
- `pnpm build` — Production build (블로그 snapshot + 메타데이터 + 개발 매니페스트 자동 생성 후 빌드)
- `pnpm start` — Start production Next.js server (빌드 후 로컬 프로덕션 테스트)
- `pnpm generate-blog-meta` — 블로그 메타데이터 수동 재생성 (`lib/blog/generated/posts-meta.ts`)
- `pnpm generate-blog-snapshot` — Supabase 블로그 snapshot 수동 재생성 (`lib/blog/generated/posts-snapshot.ts`)
- `pnpm generate-dev-manifest` — 개발 대시보드 매니페스트 수동 재생성 (`lib/dev/generated/dev-manifest.ts`)
- `pnpm test:e2e` — Playwright 스모크 테스트 실행 (홈/진료/블로그/FAQ/404/admin/sitemap 포함)
- `pnpm test:e2e:ui` — Playwright UI 모드로 디버깅
- `pnpm lint` — Run ESLint
- `pnpm deploy` — package.json에 legacy script가 남아 있어도 사용 금지. production은 `main` push 기반 자동 배포만 허용
- `pnpm review-status` — 현재 구현 상태 요약 리포트 생성
- `pnpm submit-indexnow` — 오늘 발행된 블로그 포스트 URL을 IndexNow에 제출
- `pnpm submit-indexnow:all` — 전체 사이트 URL을 IndexNow에 제출 (초기 설정 또는 전체 재인덱싱 시)

## Testing

Playwright 스모크 테스트는 Chromium 단일 프로젝트로 홈, 진료, 블로그, FAQ, 404, 관리자 진입, `sitemap.xml`까지 확인합니다. 배포 전 로컬에서 실행 권장.

```bash
pnpm test:e2e          # 스모크 테스트 실행
pnpm test:e2e:ui       # UI 모드 디버깅
```

## Project Structure

```text
app/                          # Next.js App Router pages
  layout.tsx                  # Root layout (header, footer, floating CTA, admin entry, 공통 JSON-LD)
  page.tsx                    # Homepage
  about/                      # 병원 소개
  treatments/                 # 진료 과목 목록 + 상세
  blog/                       # 블로그 허브 / 카테고리 허브 / 포스트 상세
  faq/                        # 전체 FAQ 페이지
  admin/
    login/page.tsx            # Google OAuth 로그인
    preview/[category]/[slug] # 초안 미리보기
    (dashboard)/
      page.tsx                # 6탭 관리자 콘솔 컨테이너
      components/
        DashboardTab.tsx      # 운영 요약 탭
        ContentTab.tsx        # 콘텐츠/포스트/발행 일정/성과 탭
        SeoTab.tsx            # 트래픽/검색 성과/콘텐츠 전략/트렌드 탭
        ConversionTab.tsx     # PostHog 전환 리포트 탭
        AdminSettingsTab.tsx  # 사이트 설정 탭
        DevtoolsTab.tsx       # 현황/성능/레퍼런스/모니터링/AI 로그 탭
        blog/                 # 콘텐츠 서브탭(PostsSubTab, StatsSubTab, AI 작성 모달)
        insight/              # SEO/전환 세부 서브탭
  api/
    admin/                    # 관리자용 데이터/API 엔드포인트
    dev/                      # 개발도구 엔드포인트
    cron/rebuild/route.ts     # 예약 발행 ISR 재검증 + IndexNow 자동 제출
components/
  admin/                      # 관리자 진입/편집 보조 컴포넌트
  blog/                       # 블로그 UI
  layout/                     # Header, Footer, FloatingCTA
  ui/                         # 공용 UI / Motion / Map / Accordion
hooks/                        # useAdminAuth, usePublishPopup
lib/
  constants.ts                # Single source of truth: clinic info, hours, treatments, links, reviews
  jsonld.ts                   # JSON-LD generators (clinic/treatment/blog/collection/breadcrumb/doctor/website)
  indexnow.ts                 # IndexNow 제출 유틸
  admin-*.ts                  # GA4 / Search Console / Naver / PostHog / admin helpers
  blog/                       # 블로그 타입, 카테고리, generated snapshot/meta
public/                       # fonts, images, verification files, llms.txt, IndexNow key file
docs/                         # 운영/개발 문서
scripts/                      # build helpers, IndexNow/manual utility scripts
supabase/migrations/          # schema, RLS, RPC
```

## Architecture

- **Vercel Serverless**: SSR, API Routes, Middleware, ISR, `next/image` Edge 최적화 모두 사용 가능.
- **Static + Dynamic**: `generateStaticParams()`로 빌드 시점 정적 생성 + 필요 시 SSR/ISR 혼용 가능.
- **Data centralization**: `lib/constants.ts` is the single source of truth for clinic name, address, hours, doctor info, treatments, and SEO data. Nav items (`NAV_ITEMS`) are defined in `lib/constants.ts` and imported by `components/layout/Header.tsx`. Update data in these centralized locations, not in individual pages.
- **Server/Client split**: Pages default to server components. Components needing interactivity (`"use client"`): Header, FloatingCTA, KakaoMap, BlogContent, BlogShareButton, LikeButton, Contact form, Motion wrappers, Admin convenience components (DashboardHeader, AdminFloatingButton, AdminEditButton, AdminEditIcon, AdminDraftBar, AdminSettingsLink). Footer는 서버 컴포넌트 (클라이언트 컴포넌트 AdminSettingsLink를 island로 포함). 루트 레이아웃의 Admin 컴포넌트(`AdminFloatingButton`, `AdminSettingsLink`)는 `localStorage` 게이트 + `import()` 동적 Supabase 로드로 비관리자 방문자에게 Supabase SDK 미전송.
- **Treatment↔Blog cross-referencing**: `lib/blog/index.ts`의 `TREATMENT_CATEGORY_MAP`으로 진료 과목 ID와 블로그 카테고리를 매핑. `getRelatedBlogPosts(treatmentId)` / `getRelatedTreatmentId(category)` 헬퍼 함수 제공.
  ```
  implant → 임플란트, orthodontics → 치아교정, prosthetics → 보철치료,
  pediatric → 소아치료, restorative → 보존치료, scaling → 예방관리
  ```
  `"건강상식"` 카테고리는 특정 진료 과목에 매핑되지 않음 (일반 건강 정보).
- **Blog URL structure**: `/blog/[category]/[slug]` 계층 구조. 카테고리 허브 7개 (`/blog/implant`, `/blog/orthodontics` 등). 카테고리↔URL 슬러그 매핑은 `lib/blog/category-slugs.ts`가 single source of truth.
- **SEO**: JSON-LD schemas (`lib/jsonld.ts`), Next.js Metadata API, sitemap, robots.txt. All content is Korean-language and SEO-optimized for local dental search terms.

### Rendering Strategy

| Page | Rendering | Notes |
|------|-----------|-------|
| `/` | SSG | Static at build time |
| `/about` | SSG | Static |
| `/treatments` | SSG | Static |
| `/treatments/[slug]` | SSG | `generateStaticParams()` for 6 slugs |
| `/blog` | SSG | Static (metadata from Supabase snapshot fallback) |
| `/blog/[category]` | SSG + ISR | 카테고리 허브 페이지 (7개), `generateStaticParams()` + `revalidate: 3600` |
| `/blog/[category]/[slug]` | SSG + ISR | `generateStaticParams()` + `revalidate: 3600` (1시간) |
| `/faq` | SSG | 전체 FAQ 통합 페이지 (6개 진료 과목, FAQPage JSON-LD) |
| `/contact` | Client-side | `"use client"` 전화 상담 안내 페이지 |
| `/admin` | Client-side | 관리자 대시보드 6탭 (AuthGuard 보호, `"use client"`) |
| `/admin/login` | Client-side | Google 로그인 페이지 (`"use client"`) |
| `/api/admin/*` | Server-side | Admin API Routes (GA4, SC, blog-likes, blog-posts CRUD, site-config) |
| `/api/dev/env-status` | Server-side | 환경변수 상태 API (Admin 인증) |
| `/api/dev/pagespeed` | Server-side | PageSpeed Insights API 프록시 (Admin 인증, L1 unstable_cache 24h + L2 Supabase 일별 캐시, `?force=true` 수동 갱신) |
| `/sitemap.xml` | Force Static | `export const dynamic = "force-static"` |
| `/robots.txt` | Force Static | `export const dynamic = "force-static"` |

### Supabase 데이터 아키텍처

상세 내용은 [`docs/supabase-architecture.md`](docs/supabase-architecture.md) 및 `supabase/migrations/001_initial_schema.sql` 참조. 4개 테이블 (`blog_posts`, `blog_likes`, `site_config`, `api_cache`), RLS 정책으로 보안, RPC 함수 (`toggle_like`, `get_like`), Supabase→snapshot 자동 폴백, `unstable_cache` + 2-tier 캐싱.

### 블로그 발행 워크플로우

상세 내용은 [`docs/blog-workflow.md`](docs/blog-workflow.md) 참조. 초안→발행 예약 2단계, 스케줄 기반 날짜 추천, `date <= today` 필터링, 일별 시드 셔플, BlogBlock 중심 콘텐츠 구조.

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

### Supabase 인프라

- **클라이언트** (`lib/supabase.ts`): 싱글톤, `isSupabaseConfigured`로 graceful degradation, `getAccessToken()` 함수
- **Admin** (`lib/supabase-admin.ts`): service_role key로 RLS 바이패스
- **관리자 인증** (`lib/admin-auth.ts`): Supabase Google OAuth (redirect), 이메일 화이트리스트 (`ADMIN_EMAILS`)
- **AuthGuard** (`components/admin/AuthGuard.tsx`): `onAuthStateChange` (INITIAL_SESSION 포함) → 미로그인 리다이렉트, 비관리자 차단

### 관리자 대시보드

**관리자 대시보드 (`/admin`)** — 6탭 구조 (기본 탭: `dashboard`).

- **대시보드**: 요약 카드, 해야 할 일, 핵심 CTA
- **콘텐츠**: 포스트 관리 / 발행 일정 / 성과
- **유입·SEO**: 트래픽 / 검색 성과 / 콘텐츠 전략 / 트렌드
- **전환**: PostHog 기반 CTA·전화·페이지 기여 리포트
- **사이트 설정**: SNS 링크, 병원 정보, 진료시간 저장
- **개발도구**: 현황 / 성능 / 레퍼런스 / 모니터링 / AI 로그

추가 메모:
- 구 URL(예: `?tab=dev`, `?tab=traffic`, `?tab=search`, `?tab=trend`, `?tab=blog`)은 현재 탭 구조로 자동 리다이렉트됩니다.
- 공통 관리자 API는 Supabase Admin access token 검증 후 응답하며, 대부분 `unstable_cache`와 `Cache-Control: private, no-store`를 사용합니다.
- `AdminFloatingButton`, `AdminSettingsLink`는 루트 레이아웃에서 로드되지만 `localStorage("born2smile-admin")` 게이트 + 동적 import로 비관리자 번들 영향을 최소화합니다.
- GA 관리자 트래픽 제외는 `useAdminAuth`가 설정한 localStorage 플래그와 `layout.tsx` 인라인 스크립트로 처리합니다.
- 개발도구 탭 데이터 소스는 빌드 타임 매니페스트(`lib/dev/generated/dev-manifest.ts`) + 정적 데이터(`lib/dev-data.ts`)입니다.

## Common Tasks

### 진료 과목 추가

1. `lib/constants.ts` → `TREATMENTS` 배열에 항목 추가 (`id`, `name`, `shortDesc`, `icon`, `href`)
2. `lib/treatments.ts` → `TREATMENT_DETAILS`에 상세 데이터 추가 (`TreatmentDetail` 인터페이스: `id`, `name`, `subtitle`, `description`, `steps[]`, `advantages[]`, `faq[]`)
3. `app/treatments/[slug]/page.tsx`의 `generateStaticParams()`가 자동으로 새 페이지 생성

### 블로그 포스트 추가

**방법 1: 관리자 대시보드 (권장)**

1. `/admin?tab=content&sub=posts`에서 "새 포스트 작성" 버튼 클릭
2. BlogEditor에서 제목, 부제, 요약, 카테고리, 태그, 본문 블록 입력
3. "임시저장" 클릭 → Supabase에 `published: false` 상태로 저장
4. 포스트 목록에서 해당 글의 발행/예약 발행 액션 클릭
5. PublishPopup에서 추천 날짜를 확인하거나 수정한 뒤 저장
6. `published: true` + 선택 날짜로 업데이트되고 ISR revalidate 및 IndexNow 제출 흐름이 이어짐

**공통 사항:**
- 카테고리(1개 선택): `"예방관리" | "보존치료" | "보철치료" | "임플란트" | "치아교정" | "소아치료" | "건강상식"`
- 태그(복수 선택): `BLOG_TAGS` 배열(`lib/blog/types.ts`)에 정의된 7개 태그 중 선택
   - 유형 태그: `"치료후관리"`, `"생활습관"`, `"팩트체크"`, `"증상가이드"`, `"비교가이드"`
   - 대상 태그: `"임산부"`, `"시니어"`
- 새 카테고리 추가 시 `lib/blog/types.ts`의 `BLOG_CATEGORIES`와 `BlogCategoryValue` 타입도 함께 수정
- 새 태그 추가 시 `lib/blog/types.ts`의 `BLOG_TAGS` 배열에 추가
- 블로그 목록은 접속 시마다 랜덤 순서로 표시됨 (클라이언트 측 셔플, 12개씩 페이지네이션)

### 병원 정보 수정

**방법 1: 관리자 대시보드** — `/admin?tab=settings`에서 SNS 링크, 병원 정보, 진료시간을 실시간 편집합니다 (Supabase `site_config` 테이블에 저장). 발행 스케줄은 `/admin?tab=content&sub=schedule`에서 편집합니다.

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

`lib/jsonld.ts`에는 현재 사용 중인 JSON-LD 생성기(Clinic, Treatment/MedicalWebPage, FAQ, BlogPost, Breadcrumb)가 있습니다.
`getHowToJsonLd()` 헬퍼는 파일에 남아 있지만 현재 라우트에서는 렌더링하지 않습니다.

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

Vercel로 배포 (Edge Network + Serverless Functions):

- `vercel.json` — Cron Jobs 설정 (예약 발행용 daily revalidate)
- GitHub 연동 — `main` push → 자동 배포, PR/브랜치 → Vercel Preview 배포
- 정적 에셋은 Vercel Edge Network (서울 PoP 포함)에서 캐싱
- SSR/API Routes는 Serverless Functions에서 처리
- `next/image` Edge 최적화
- 환경변수: Vercel Dashboard → Settings → Environment Variables

### 예약 발행 자동 재빌드

Vercel Cron Job (`vercel.json`)이 매일 KST 00:05 (UTC 15:05)에 `/api/cron/rebuild` 엔드포인트를 호출하여 블로그 경로 ISR 재검증을 트리거합니다. 이 경로는 `CRON_SECRET`으로 인증되며, 당일 발행 포스트와 `/blog`, `/sitemap.xml`을 함께 재검증합니다.

### IndexNow

[IndexNow](https://www.indexnow.org/)를 통해 새 콘텐츠를 검색엔진(Bing, Naver, Yandex 등)에 즉시 알립니다.

- **API 키 파일**: `public/<INDEXNOW_KEY>.txt`
- **자동 제출**: `/api/cron/rebuild`가 당일 발행 포스트 URL과 sitemap을 함께 제출 (`lib/indexnow.ts`)
- **수동 제출**: `pnpm submit-indexnow` (오늘 발행분) / `pnpm submit-indexnow:all` (전체 URL)

## Environment Variables

상세 내용은 [`docs/environment-variables.md`](docs/environment-variables.md) 참조. 로컬 개발: `.env.example` → `.env.local`, 프로덕션: Vercel Dashboard → Settings → Environment Variables. 핵심 변수는 Supabase(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), 운영 자동화(`CRON_SECRET`, `INDEXNOW_KEY`), 분석/모니터링(`GOOGLE_SERVICE_ACCOUNT_KEY`, PostHog, Sentry)입니다.

## Known TODO Items

[`docs/todo.md`](docs/todo.md) 참조. `lib/admin-data.ts`의 `IMPROVEMENT_ITEMS`에서 전체 개선 항목 관리, 관리자 대시보드 개발>현황 서브탭에서 실시간 현황 확인 가능.
