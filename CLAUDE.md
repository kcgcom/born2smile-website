# CLAUDE.md

## Project Overview

Dental clinic website for "서울본치과" (Seoul Born Dental Clinic) in Gimpo, South Korea. Full-stack Next.js app deployed to Firebase App Hosting (Cloud Build + Cloud Run + Cloud CDN).

- **Site URL**: `https://www.born2smile.co.kr`
- **Firebase Site**: `seoul-born2smile` (Firebase Hosting redirects to App Hosting)

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router, React 19.2.3, TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 (inline `@theme` in `globals.css`, no separate `tailwind.config` file), CSS custom properties
- **Animation**: Framer Motion 12 (`components/ui/Motion.tsx` provides `<FadeIn>`, `<StaggerContainer>`, `<StaggerItem>`)
- **Icons**: Lucide React
- **Maps**: Kakao Maps SDK (async loaded)
- **Charts**: Recharts 2 (dynamic import, 트래픽/검색/블로그 탭 인터랙티브 차트)
- **Validation**: Zod v4 (`zod/v4`, 블로그 CRUD + 사이트 설정 API 입력 검증)
- **Database**: Firebase Firestore (블로그 포스트 저장소 + 좋아요 + 사이트 설정)
- **Auth**: Firebase Auth (Google 로그인, 관리자 대시보드 전용) + Firebase Admin SDK (서버 사이드 토큰 검증)
- **Analytics**: Google Analytics 4 Data API (`@google-analytics/data`), Google Search Console API (`googleapis`)
- **Package Manager**: pnpm
- **Deployment**: Firebase App Hosting (`output: "standalone"` in `next.config.ts`, Cloud Run 기반)

## Getting Started

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_KAKAO_MAP_APP_KEY 입력
pnpm dev                      # http://localhost:3000
```

## Commands

- `pnpm dev` — Start dev server (블로그 메타데이터 자동 생성 후 실행)
- `pnpm build` — Production build (블로그 메타데이터 자동 생성 후 빌드, standalone output to `.next/`)
- `pnpm start` — Start production Next.js server (빌드 후 로컬 프로덕션 테스트)
- `pnpm generate-blog-meta` — 블로그 메타데이터 수동 재생성 (`lib/blog/generated/posts-meta.ts`)
- `pnpm lint` — Run ESLint
- `pnpm deploy` — Deploy to Firebase App Hosting (빌드는 Cloud Build에서 원격 실행)
- `pnpm submit-indexnow` — 오늘 발행된 블로그 포스트 URL을 IndexNow에 제출
- `pnpm submit-indexnow:all` — 전체 사이트 URL을 IndexNow에 제출 (초기 설정 또는 전체 재인덱싱 시)

## No Test Suite

There is no testing framework configured. No test commands are available.

## Project Structure

```
app/                          # Next.js App Router pages
  layout.tsx                  # Root layout (header, footer, floating CTA, admin floating button, JSON-LD)
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
    [slug]/page.tsx           # Individual treatment detail (generateStaticParams)
    [slug]/loading.tsx        # Suspense loading boundary
  blog/
    page.tsx                  # Blog hub (delegates to BlogContent)
    [slug]/page.tsx           # Individual blog post detail (generateStaticParams)
    [slug]/loading.tsx        # Suspense loading boundary
  admin/
    layout.tsx                # Admin layout (noindex, Header/Footer CSS 숨김)
    (dashboard)/
      layout.tsx              # AuthGuard wrapper
      page.tsx                # Dashboard main — 5탭 컨테이너 ("use client")
      components/
        AdminTabs.tsx         # 탭 네비게이션 (개요/트래픽/검색·SEO/블로그/설정)
        OverviewTab.tsx       # 개요 탭 (Recharts 파이차트, 블로그 통계, 사이트 설정)
        TrafficTab.tsx        # 트래픽 탭 (Recharts 바/파이/영역 차트, GA4 Data API)
        SearchTab.tsx         # 검색/SEO 탭 (Recharts 바 차트, Search Console API)
        BlogTab.tsx           # 블로그 관리 탭 (CRUD, 발행 예약, 검색/필터/정렬, 좋아요 집계)
        BlogEditor.tsx        # 블로그 포스트 편집기 (임시저장/발행 유지, Zod 검증)
        SettingsTab.tsx       # 설정 탭 (SNS 링크/병원 정보/진료시간/발행 스케줄 편집)
        StatCard.tsx          # 통계 카드 (아이콘 + 값 + 라벨)
        ConfigRow.tsx         # 설정 행 (라벨 + 값 표시)
        MetricCard.tsx        # 지표 카드 (값 + 증감률)
        DataTable.tsx         # 범용 데이터 테이블 (정렬/검색 기능)
        AdminErrorState.tsx   # 공통 에러 상태 UI
        AdminLoadingSkeleton.tsx # 공통 로딩 스켈레톤 UI
        PeriodSelector.tsx    # 기간 선택 버튼 그룹
        useAdminApi.ts        # Admin API 데이터 페칭 훅 (SWR 패턴)
    login/
      page.tsx                # Google login page ("use client")
  api/
    admin/
      _lib/
        auth.ts               # Admin API 인증 미들웨어 (Firebase Admin SDK)
        cache.ts              # unstable_cache 래퍼 + TTL 상수
      analytics/
        route.ts              # GA4 트래픽 데이터 API (GET)
      search-console/
        route.ts              # Search Console 검색 성과 API (GET)
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
    LikeButton.tsx            # Firestore 좋아요 버튼 ("use client")
  admin/
    AuthGuard.tsx             # Firebase Auth guard ("use client")
    AdminFloatingButton.tsx   # 관리자 플로팅 대시보드 버튼 ("use client")
    AdminEditButton.tsx       # 관리자 인라인 편집 버튼 — 라벨 포함 ("use client")
    AdminEditIcon.tsx         # 관리자 인라인 편집 아이콘 — 아이콘만 ("use client")
    AdminPublishButton.tsx    # 관리자 발행 예약 버튼 — draft 포스트 상세 페이지용 ("use client")
    AdminSettingsLink.tsx     # 관리자 설정 편집 링크 ("use client")
  layout/                     # Header, Footer, FloatingCTA
  ui/                         # Motion (animations), KakaoMap, CTABanner, FaqAccordion
hooks/
  useAdminAuth.ts            # 공유 관리자 인증 훅 (Firebase onAuthStateChanged + isAdminEmail)
lib/
  constants.ts               # Single source of truth: clinic info, hours, treatments, nav, SEO
  treatments.ts              # Treatment detail descriptions, steps, advantages, FAQ
  date.ts                    # KST 날짜 유틸리티 (getTodayKST)
  format.ts                  # 날짜 포맷 유틸리티 (formatDate)
  firebase.ts                # Firebase 클라이언트 초기화 (Firestore + Auth)
  admin-auth.ts              # 관리자 인증 모듈 (Google 로그인, 이메일 화이트리스트)
  admin-data.ts              # 관리자 대시보드 데이터 (개선 항목, 블로그 통계, 사이트 설정)
  admin-utils.ts             # 관리자 공통 유틸리티 (calcChange)
  firebase-admin.ts          # Firebase Admin SDK 싱글톤 (ADC 우선, JSON key 폴백)
  admin-analytics.ts         # GA4 Data API 클라이언트 (KST 기간 계산, 기간 비교)
  admin-search-console.ts    # Search Console API 클라이언트 (3일 지연 오프셋, dynamic import)
  blog-firestore.ts          # Firestore 블로그 CRUD (Admin SDK, unstable_cache, ISR revalidate)
  blog-validation.ts         # Zod 검증 스키마 (블로그 포스트 + 사이트 설정 + 발행 스케줄)
  site-config-firestore.ts   # Firestore 사이트 설정 CRUD (links, clinic, hours, schedule)
  fonts.ts                   # Local font config (Pretendard, Noto Serif KR)
  jsonld.ts                  # JSON-LD generators: clinic, treatment, FAQ, blog post, breadcrumb
  blog/
    types.ts                 # BlogPost, BlogPostMeta 인터페이스, 카테고리/태그 상수
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
scripts/
  generate-blog-meta.ts      # 빌드 시 포스트 파일에서 메타데이터 자동 추출 스크립트
  submit-indexnow.mjs        # IndexNow URL 제출 스크립트 (Node.js 내장 모듈만 사용)
  migrate-blog-to-firestore.ts # 파일 → Firestore 블로그 마이그레이션 (1회성)
  verify-migration.ts        # 마이그레이션 검증 스크립트
  deploy-firestore.ts        # Firestore 인덱스/규칙 REST API 배포
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
- **Data centralization**: `lib/constants.ts` is the single source of truth for clinic name, address, hours, doctor info, treatments, and SEO data. Nav items are defined locally in `components/layout/Header.tsx`. Update data in these centralized locations, not in individual pages.
- **Server/Client split**: Pages default to server components. Components needing interactivity (`"use client"`): Header, FloatingCTA, KakaoMap, BlogContent, BlogShareButton, LikeButton, Contact form, Motion wrappers, Admin convenience components (AdminFloatingButton, AdminEditButton, AdminEditIcon, AdminPublishButton, AdminSettingsLink). Footer는 서버 컴포넌트 (클라이언트 컴포넌트 AdminSettingsLink를 island로 포함).
- **Treatment↔Blog cross-referencing**: `lib/blog/index.ts`의 `TREATMENT_CATEGORY_MAP`으로 진료 과목 ID와 블로그 카테고리를 매핑. `getRelatedBlogPosts(treatmentId)` / `getRelatedTreatmentId(category)` 헬퍼 함수 제공.
  ```
  implant → 임플란트, orthodontics → 치아교정, prosthetics → 보철치료,
  pediatric → 소아치료, restorative → 보존치료, scaling → 예방·구강관리
  ```
  `"구강건강상식"` 카테고리는 특정 진료 과목에 매핑되지 않음 (일반 건강 정보).
- **SEO**: JSON-LD schemas (`lib/jsonld.ts`), Next.js Metadata API, sitemap, robots.txt. All content is Korean-language and SEO-optimized for local dental search terms.

### Rendering Strategy

| Page | Rendering | Notes |
|------|-----------|-------|
| `/` | SSG | Static at build time |
| `/about` | SSG | Static |
| `/treatments` | SSG | Static |
| `/treatments/[slug]` | SSG | `generateStaticParams()` for 6 slugs |
| `/blog` | SSG | Static (metadata from Firestore, 파일 폴백) |
| `/blog/[slug]` | SSG + ISR | `generateStaticParams()` + `revalidate: 3600` (1시간) |
| `/contact` | Client-side | `"use client"` 전화 상담 안내 페이지 |
| `/admin` | Client-side | 관리자 대시보드 5탭 (AuthGuard 보호, `"use client"`) |
| `/admin/login` | Client-side | Google 로그인 페이지 (`"use client"`) |
| `/api/admin/*` | Server-side | Admin API Routes (GA4, SC, blog-likes, blog-posts CRUD, site-config) |
| `/sitemap.xml` | Force Static | `export const dynamic = "force-static"` |
| `/robots.txt` | Force Static | `export const dynamic = "force-static"` |

### Firestore 데이터 아키텍처

블로그 포스트의 Single Source of Truth가 파일(`lib/blog/posts/*.ts`)에서 **Firestore**(`blog-posts` 컬렉션)로 이전됨. 파일 기반 데이터는 폴백으로 유지.

**컬렉션 구조:**

| 컬렉션 | 문서 ID | 용도 | 접근 |
|--------|---------|------|------|
| `blog-posts` | `{slug}` | 블로그 포스트 (80개) | Admin SDK 전용 |
| `blog-likes` | `{slug}` | 좋아요 카운트 + 사용자 UUID | 클라이언트 read/write |
| `site-config` | `links\|clinic\|hours\|schedule` | 사이트 설정 + 발행 스케줄 | Admin SDK 전용 |

**복합 인덱스 (3개):**
- `blog-posts`: `published` ASC + `date` DESC
- `blog-posts`: `category` ASC + `date` DESC
- `blog-posts`: `published` ASC + `category` ASC + `date` DESC

**폴백 전략:** Firestore 복합 인덱스 미배포 시 `FAILED_PRECONDITION` 에러를 감지하여 파일 기반 `BLOG_POSTS_META`로 자동 폴백. 빌드 안정성 보장.

**캐싱:** `unstable_cache` + `revalidateTag` 조합. 블로그 TTL 1시간, 사이트 설정 TTL 1시간, 관리자 블로그 목록 5분. CRUD 후 `revalidateTag(tag, "max")`으로 즉시 무효화.

### 블로그 발행 워크플로우

**임시저장 → 발행 예약 2단계 워크플로우:**

1. **임시저장/수정**: BlogEditor에서 새 포스트 저장 시 `published: false` (draft) 상태로 Firestore에 저장. 이미 발행된 포스트 수정 시에는 `published: true` 상태 유지
2. **발행 예약**: BlogTab 포스트 목록에서 draft 포스트의 "발행" 버튼 클릭 → PublishPopup에서 스케줄 기반 추천 날짜 확인/변경 → "발행 예약" 클릭 시 `published: true` + 선택한 날짜로 업데이트. "오늘" 버튼으로 즉시 발행 가능 (오늘 날짜 선택 시 안내 메시지 표시)

**발행 날짜 추천 로직** (`getNextPublishDate`):
1. `site-config/schedule`에서 발행 요일 목록 조회 (기본: 월/수/금 = `[1,3,5]`)
2. 이미 발행 예약된 포스트(`published: true` + 미래 날짜)의 날짜 수집
3. 오늘부터 90일 내에서 스케줄 요일에 해당하면서 아직 포스트가 없는 가장 빠른 날짜 추천

**발행 후 노출 메커니즘** — `published: true`이면서 `date <= today`인 포스트만 공개 사이트에 노출:

1. **클라이언트 필터링** (`BlogContent.tsx`): `date <= today` 조건으로 미발행 포스트 제외
2. **Sitemap 필터링** (`app/sitemap.ts`): 동일 조건으로 미발행 포스트 sitemap에서 제외

블로그 목록 표시 전략 (일별 시드 셔플):
- **SSR/CSR 동일 순서**: 날짜 기반 고정 시드 Fisher-Yates 셔플 (CLS 방지)
- **매일 다른 순서**: 오늘 날짜를 시드로 사용하여 하루 동안 동일한 순서 유지
- **페이지네이션**: Intersection Observer 기반 무한 스크롤, 12개씩 로드

### 블로그 포스트 콘텐츠 구조

각 포스트 파일은 `BlogPost` 인터페이스를 따르며, 본문은 `BlogPostSection[]` 배열:

```typescript
content: [
  { heading: "섹션 제목", content: "섹션 본문 텍스트" },
  { heading: "다음 섹션", content: "..." },
]
```

빌드 시 `generate-blog-meta.ts` 스크립트가 포스트 파일에서 메타데이터만 추출하고 `content` 필드는 제거하여 `posts-meta.ts`를 생성. 이를 통해 목록 페이지 번들에 본문이 포함되지 않아 번들 크기 최적화. `readTime`은 content 글자 수 기반으로 자동 계산 (한국어 분당 ~500자, 최소 1분, 올림 적용). 포스트 파일에 `readTime`을 수동 입력해도 빌드 시 자동 계산 값으로 덮어씌움.

### 블로그 작성 가이드라인

블로그 포스트 작성 시 `docs/blog-writing-guide.md` 참조 (브랜드 보이스, 문체 원칙, 글 구조, 섹션 전개, 전문 용어 통일표, SEO 검색 표현, 연결 표현).

### Font System

`next/font/local`로 로컬 폰트를 로드하고 CSS 변수로 연결:

| Font | CSS Variable | Usage |
|------|-------------|-------|
| Pretendard Variable | `--font-pretendard` | 본문 기본 (`font-sans`) |
| Noto Serif KR (400, 700) | `--font-noto-serif` | 헤드라인 (`font-serif`, `.font-headline`) |
| Gowun Batang (400, 700) | `--font-gowun-batang` | 인사말 편지 (`.font-greeting`) |

`lib/fonts.ts`에서 설정 → `app/layout.tsx`의 `<html>` 태그에 variable 적용 → `globals.css`의 `@theme inline`에서 Tailwind와 연결.

### Design Tokens & Utility Classes

`app/globals.css`에 정의된 컬러 시스템:

블루(전문성/신뢰) + 골드(따뜻함/프리미엄) 듀얼 컬러 시스템:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#2563EB` | 블루 - 주요 강조색 (CTA 버튼, 링크, 폼 포커스) |
| `--color-primary-dark` | `#1D4ED8` | 블루 hover 상태 |
| `--color-primary-light` | `#3B82F6` | 밝은 블루 강조 |
| `--color-secondary` | `#0EA5E9` | 보조 블루 |
| `--color-gold` | `#C9962B` | 골드 - 따뜻한 액센트 (섹션 라벨, 의료진 타이틀, 배지) |
| `--color-gold-dark` | `#A67B1E` | 골드 hover/진한 상태 |
| `--color-gold-light` | `#D4B869` | 밝은 골드 |
| `--background` | `#FAFBFC` | 페이지 배경 |
| `--foreground` | `#111827` | 본문 텍스트 |
| `--surface` | `#FFFFFF` | 카드/패널 배경 |
| `--border` | `#E5E7EB` | 구분선 |
| `--muted` | `#6B7280` | 보조 텍스트 |
| `--muted-light` | `#9CA3AF` | 밝은 보조 텍스트 |

커스텀 유틸리티 클래스:

- `.section-padding` — 섹션 공통 패딩 (`px-4 py-16` ~ `lg:px-8 lg:py-32`)
- `.container-narrow` — 최대 너비 컨테이너 (`max-w-6xl mx-auto`)
- `.font-headline` — 세리프 헤드라인 폰트 (Noto Serif KR)
- `.font-greeting` — 인사말 편지 폰트 (Gowun Batang)
- `.greeting-letter` — 편지 스타일 카드 (그라데이션 배경, 라운드 코너)

### Key Components

**FloatingCTA** (`components/layout/FloatingCTA.tsx`):
- 모바일: 하단 고정 네비게이션 바 (홈, 병원소개, 진료안내, 건강칼럼, 상담안내 5개 버튼, `grid-cols-5`). 상담안내는 골드 색상, 나머지는 블루.
- 데스크톱: 우하단 플로팅 전화 버튼 (`tel:` 링크)

**KakaoMap** (`components/ui/KakaoMap.tsx`):
- SDK를 `document.head.appendChild(script)`로 동적 로드
- 이중 좌표 전략: 주소 기반 Kakao Geocoder API 시도 → 실패 시 `lib/constants.ts`의 하드코딩 좌표로 폴백
- Cloud Secret Manager 공백 문제 대응: 환경 변수 값을 `.trim()` 처리

**LikeButton** (`components/blog/LikeButton.tsx`):
- Firestore 스키마: `blog-likes/{slug}` 컬렉션, `count`(int) + `users`(UUID 배열) 필드
- 사용자 식별: `crypto.randomUUID()`로 생성한 UUID를 `localStorage`(`born2smile_uid` 키)에 저장
- Optimistic update: UI 즉시 반영 → `runTransaction()`으로 원자적 저장 → 실패 시 롤백
- Firebase 미설정 시 graceful degradation: `isFirebaseConfigured` 플래그로 판단, 버튼 비활성 표시. 장애 모니터링은 Firebase Cloud Monitoring 알림으로 운영.

**BlogShareButton** (`components/blog/BlogShareButton.tsx`):
- Web Share API 우선 사용 (`navigator.share`) → 미지원 브라우저에서 클립보드 복사 폴백

**CTABanner** (`components/ui/CTABanner.tsx`):
- 공통 CTA 배너 컴포넌트 (`heading`, `description` props)
- 홈, 블로그 상세, 진료 상세 3곳에서 공유 사용
- 전화 상담 버튼 (`tel:` 링크) + 병원 전화번호 표시

### Firebase 클라이언트 (`lib/firebase.ts`)

- 최소 설정: `apiKey` + `projectId`만 사용
- `isFirebaseConfigured` boolean export: API key 미설정 시 Firestore 의존 기능(좋아요)을 graceful하게 비활성화
- 기본 projectId: `"seoul-born2smile"` (환경 변수 없으면 폴백)
- 싱글톤 패턴: 이미 초기화된 앱이 있으면 재사용
- **Auth 지연 초기화**: `getFirebaseAuth()`, `getGoogleProvider()` — 빌드 시점 API key 검증 오류 방지를 위해 lazy getter 패턴 사용. 모듈 import 시점이 아닌 최초 호출 시점에 Auth 인스턴스 생성.

### 관리자 인증 (`lib/admin-auth.ts`)

- `ADMIN_EMAILS`: `NEXT_PUBLIC_ADMIN_EMAILS` 환경변수에서 읽어 화이트리스트 관리
- `isAdminEmail(email)`: 이메일 화이트리스트 검증
- `signInWithGoogle()`: `signInWithPopup` + `GoogleAuthProvider`
- `signOutAdmin()`: Firebase Auth 로그아웃

### Firebase Admin SDK (`lib/firebase-admin.ts`)

- 싱글톤 패턴: `getAdminApp()` — 이미 초기화된 앱이 있으면 재사용
- **ADC (Application Default Credentials) 우선**: Cloud Run 환경에서 자동 인증
- **JSON key 폴백**: `GOOGLE_SERVICE_ACCOUNT_KEY` 환경변수 (로컬 개발용)
- GA4/SC API 인증에도 동일 크레덴셜 사용

### 관리자 대시보드 데이터 (`lib/admin-data.ts`)

- `IMPROVEMENT_ITEMS`: 웹사이트 개선 항목 배열 (id, 제목, 우선순위, 상태, 설명)
- `getImprovementStats()`: 우선순위별 완료/전체 통계
- `getBlogStats()`: `BLOG_POSTS_META`에서 전체/발행/예약 포스트 수, 카테고리별 분포
- `getSiteConfigStatus()`: SNS 링크, Firebase 설정, 환경변수 상태 확인

### 관리자 대시보드 (`app/admin/(dashboard)/`)

5탭 구조 대시보드. URL query param `?tab=traffic`으로 탭 상태 관리.

| 탭 | 컴포넌트 | 데이터 소스 | 주요 기능 |
|---|---|---|---|
| 개요 | `OverviewTab.tsx` | `lib/admin-data.ts` | Recharts 파이차트, 블로그 통계, 사이트 설정 현황 |
| 트래픽 | `TrafficTab.tsx` | `/api/admin/analytics` (GA4) | 바/파이/영역 차트, 인기 페이지, 유입 경로, 기기별 |
| 검색/SEO | `SearchTab.tsx` | `/api/admin/search-console` | 바 차트, 상위 키워드/페이지, 블로그 검색 성과 |
| 블로그 | `BlogTab.tsx` | `/api/admin/blog-posts` + `blog-likes` + `site-config/schedule` | CRUD (임시저장/수정/삭제), 발행 예약 팝업, 통계 카드 클릭 필터, 검색/필터/정렬, 좋아요 집계 |
| 설정 | `SettingsTab.tsx` | `/api/admin/site-config` | SNS 링크/병원 정보/진료시간/발행 스케줄 편집 |

### Admin API Routes (`app/api/admin/`)

- **공통 인증** (`_lib/auth.ts`): `verifyAdminRequest()` — Firebase Admin SDK로 ID 토큰 검증, `checkRevoked: true`, `email_verified` 확인, 401/403 구분
- **공통 캐시** (`_lib/cache.ts`): `unstable_cache` 래퍼, TTL — GA4: 1시간, SC: 6시간, 좋아요: 5분
- **응답 헤더**: 모든 경로에 `Cache-Control: private, no-store`
- `GET /api/admin/analytics?period=7d|30d|90d` — GA4 트래픽 지표 (세션, 사용자, 페이지뷰, 인기 페이지, 유입 경로, 기기별, 일별 추이)
- `GET /api/admin/search-console?period=7d|28d|90d` — 검색 성과 (노출, 클릭, CTR, 순위, 상위 키워드/페이지, 블로그 검색 성과). 3일 데이터 지연 오프셋 자동 적용
- `GET /api/admin/blog-likes` — Firestore `blog-likes` 컬렉션 전체 좋아요 수 집계
- `GET /api/admin/blog-posts` — 전체 블로그 포스트 메타 목록 (관리자용, published 상태 포함)
- `POST /api/admin/blog-posts` — 새 블로그 포스트 생성 (Zod `blogPostSchema` 검증)
- `GET /api/admin/blog-posts/[slug]` — 단일 포스트 조회 (본문 포함)
- `PUT /api/admin/blog-posts/[slug]` — 포스트 수정 (Zod `blogPostUpdateSchema` 검증)
- `DELETE /api/admin/blog-posts/[slug]` — 포스트 삭제
- `GET /api/admin/site-config/[type]` — 사이트 설정 조회 (type: `links|clinic|hours|schedule`)
- `PUT /api/admin/site-config/[type]` — 사이트 설정 수정 (Zod 스키마 검증). `schedule` 타입은 발행 요일 설정 (`publishDays: number[]`, 0=일~6=토)

### AuthGuard (`components/admin/AuthGuard.tsx`)

- `onAuthStateChanged`로 로그인 상태 감시
- 미로그인 → `/admin/login`으로 리다이렉트
- 로그인했지만 관리자 아님 → 접근 거부 메시지 + 로그아웃 버튼
- 관리자 확인 → children 렌더
- Route group `(dashboard)` 하위에 적용되어 로그인 페이지는 보호 대상에서 제외

### 관리자 편의 기능

관리자 로그인 시 공개 사이트에서 관리자 페이지로의 동선을 제공하는 클라이언트 전용 UI 요소들.

**공유 훅:** `hooks/useAdminAuth.ts`
- Firebase `onAuthStateChanged` + `isAdminEmail`로 관리자 감지
- 초기값 `false` → SSR/hydration 시 관리자 UI 미렌더링 (CLS 방지)
- `isFirebaseConfigured` 체크로 Firebase 미설정 시 graceful degradation
- 비로그인/일반 사용자에게는 관리자 관련 UI가 전혀 보이지 않음

**플로팅 버튼:** `components/admin/AdminFloatingButton.tsx`
- 모든 공개 페이지에서 `/admin` 대시보드로 이동하는 좌하단 플로팅 버튼
- 스타일: `bg-gray-600` (Footer `bg-gray-900` 배경에서 대비 확보)
- 모바일: `bottom-20 left-4` (FloatingCTA 네비바 위), 데스크톱: `bottom-6 left-6`
- `/admin` 경로에서는 자동 숨김 (`usePathname()` 체크)

**인라인 편집:**
- `AdminEditButton` — 블로그 상세 페이지 헤더에 "수정" 버튼 (라벨 포함)
- `AdminPublishButton` — 블로그 상세 페이지 헤더에 "발행 예약" 버튼 (draft 포스트만 표시, 스케줄 기반 추천 날짜 팝업)
- `AdminEditIcon` — 블로그 목록 카드에 연필 아이콘 (아이콘만)
- `AdminSettingsLink` — Footer 오시는 길/진료시간 옆 "편집" 링크
- 모두 `/admin?tab=blog&edit={slug}` 또는 `/admin?tab=settings`로 딥링크

**대시보드 딥링크:** `?tab=blog&edit={slug}` URL로 접근 시 BlogTab이 해당 포스트 편집기를 자동 오픈

**대시보드 사이트 이동:** 관리자 헤더의 병원명 클릭 → 홈페이지(`/`)로 이동

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
- 카테고리(1개 선택): `"예방·구강관리" | "보존치료" | "보철치료" | "임플란트" | "치아교정" | "소아치료" | "구강건강상식"`
- 태그(복수 선택): `BLOG_TAGS` 배열(`lib/blog/types.ts`)에 정의된 7개 태그 중 선택
   - 유형 태그: `"치료후관리"`, `"생활습관"`, `"팩트체크"`, `"증상가이드"`, `"비교가이드"`
   - 대상 태그: `"임산부"`, `"시니어"`
- 새 카테고리 추가 시 `lib/blog/types.ts`의 `BLOG_CATEGORIES`와 `BlogCategoryValue` 타입도 함께 수정
- 새 태그 추가 시 `lib/blog/types.ts`의 `BLOG_TAGS` 배열에 추가
- 블로그 목록은 접속 시마다 랜덤 순서로 표시됨 (클라이언트 측 셔플, 12개씩 페이지네이션)

### 병원 정보 수정

**방법 1: 관리자 대시보드** — `/admin` → 설정 탭에서 SNS 링크, 병원 정보, 진료시간, 발행 스케줄 실시간 편집 (Firestore `site-config` 컬렉션에 저장).

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

`lib/jsonld.ts`에서 5종의 JSON-LD 스키마 생성:

- `getClinicJsonLd()` — Dentist + LocalBusiness (홈, 소개 페이지)
- `getTreatmentJsonLd(id)` — MedicalWebPage (진료 상세 페이지)
- `getFaqJsonLd(faq)` — FAQPage (FAQ가 있는 진료 상세 페이지)
- `getBlogPostJsonLd(post)` — BlogPosting (블로그 상세 페이지)
- `getBreadcrumbJsonLd(items)` — BreadcrumbList (중첩 페이지)

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

로컬 개발: `.env.example` → `.env.local`로 복사하여 사용.
프로덕션: `apphosting.yaml`의 `env` 섹션 + Cloud Secret Manager로 관리.

- `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` — Kakao Maps JavaScript App Key (required for map component)
- `NEXT_PUBLIC_FIREBASE_API_KEY` — Firebase Web API Key (required for Firestore 좋아요 + 관리자 인증)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` — Firebase Project ID (default: `seoul-born2smile`)
- `NEXT_PUBLIC_ADMIN_EMAILS` — 관리자 이메일 화이트리스트 (쉼표 구분, default: `kcgcom@gmail.com`)
- `GOOGLE_SERVICE_ACCOUNT_KEY` — Google 서비스 계정 JSON key (로컬 개발 전용). 프로덕션은 Cloud Run ADC가 자동 인증하므로 불필요. App Hosting 서비스 계정(`firebase-app-hosting-compute@seoul-born2smile.iam.gserviceaccount.com`)에 GA4 뷰어 + Search Console 전체 권한 필요.
- `GA4_PROPERTY_ID` — Google Analytics 4 속성 ID (숫자만, 예: `525397980`, 트래픽 탭 필수)
- `SEARCH_CONSOLE_SITE_URL` — Search Console 사이트 URL (예: `sc-domain:born2smile.co.kr`, 검색/SEO 탭 필수)

## Known TODO Items

> 마지막 점검: 2026-02-21

### 미완료 — 오너 비즈니스 결정 필요

- `lib/constants.ts` `LINKS`: SNS 링크(카카오, 인스타, 네이버블로그, 지도 링크) — 현재 빈 문자열. 채우면 Footer 아이콘, Contact 페이지 카카오 상담 버튼, `getClinicJsonLd()`의 `sameAs`에 자동 반영
- `app/contact/page.tsx`: 온라인 예약 시스템 미구축 — 현재 전화 상담 안내 페이지로 운영 중. 향후 온라인 예약 시스템 도입 시 폼 추가 필요
- 페이지별 OG 이미지 차별화 — 현재 모든 페이지 동일 OG 이미지. 카테고리별 이미지 또는 동적 생성 검토
- 의사 프로필 사진 추가 — 한국 의료 사이트 최고 신뢰 신호, 사진 제공 필요

### 개선 현황 (61/68개 완료, 90%)

`lib/admin-data.ts`의 `IMPROVEMENT_ITEMS`에서 전체 개선 항목 관리. 관리자 대시보드 개요 탭에서 실시간 현황 확인 가능.

- CRITICAL: 4/4 완료
- HIGH: 16/18 완료 (미완료: OG 이미지 차별화, 온라인 예약)
- MEDIUM: 24/28 완료 (미완료: SNS 링크 4건 — 오너 결정 필요)
- LOW: 15/16 완료 (미완료: 의사 프로필 사진)

### 해결됨

- ~~관리자 대시보드 종합 개선~~ — 해결 (2026-02-21): Recharts 차트, 블로그 CRUD, 사이트 설정 편집, Firestore 마이그레이션 완료. 80개 포스트 Firestore 이전, SSG+ISR 하이브리드 렌더링, Zod 검증, 공통 컴포넌트 추출
- ~~`lib/constants.ts`: 지도 좌표(`MAP`) 정확도 확인 필요~~ — 해결: 카카오맵 주소 기반 geocoding이 정상 동작하므로 하드코딩 좌표는 폴백용으로만 사용
- ~~`lib/jsonld.ts` `getBlogPostJsonLd()`: `dateModified`가 `datePublished`와 동일~~ — 해결: `BlogPostMeta`에 `dateModified?: string` 필드 추가, `getBlogPostJsonLd()`에서 `post.dateModified ?? post.date`로 처리. 포스트 파일에 `dateModified` 필드를 추가하면 자동 반영됨
- ~~시설 사진 섹션: 현재 홈페이지에서 숨김 처리됨~~ — 해결: `app/about/page.tsx`에 시설 안내 섹션 표시 중, `public/images/facility/`에 6장(진료실, 대기실, 상담실, VIP실, X-ray실, 외관) 포함
- ~~`hosting-redirect/`: Naver 웹마스터 인증 파일만 존재~~ — 정상: `firebase.json`의 regex redirect로 App Hosting 전달 처리 중. 인증 파일 서빙 목적으로 설계된 구조이므로 추가 작업 불필요
- ~~PretendardVariable 폰트 서브셋~~ — 검토 완료: 한국어 Variable 2MB는 표준 크기, 서브셋/정적 전환 시 이점 미미
- ~~블로그 dateModified 필드~~ — 인프라 준비 완료: sitemap + JSON-LD에서 `dateModified` 자동 반영. 포스트 수정 시 필드 추가하면 됨
