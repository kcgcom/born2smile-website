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
- **Database**: Firebase Firestore (블로그 좋아요 기능)
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
  layout.tsx                  # Root layout (header, footer, floating CTA, JSON-LD)
  page.tsx                    # Homepage (hero, values, treatments, doctor, map, CTA)
  globals.css                 # Design tokens, @theme inline, utility classes
  favicon.ico                 # Favicon
  robots.ts                   # robots.txt generation (force-static)
  sitemap.ts                  # Sitemap XML generation (force-static, includes blog posts)
  about/page.tsx              # Clinic info, doctor bio, facility, hours
  treatments/
    page.tsx                  # Treatment listing (6 cards)
    [slug]/page.tsx           # Individual treatment detail (generateStaticParams)
  blog/
    page.tsx                  # Blog hub (delegates to BlogContent)
    [slug]/page.tsx           # Individual blog post detail (generateStaticParams)
  contact/
    layout.tsx                # Contact layout wrapper with metadata
    page.tsx                  # 전화 상담 안내 + 오시는 길 ("use client")
components/
  blog/
    BlogContent.tsx           # Blog listing/display component ("use client")
    BlogShareButton.tsx       # Share button with Web Share API + clipboard fallback ("use client")
    LikeButton.tsx            # Firestore 좋아요 버튼 ("use client")
  layout/                     # Header, Footer, FloatingCTA
  ui/                         # Motion (animations), KakaoMap
lib/
  constants.ts               # Single source of truth: clinic info, hours, treatments, nav, SEO
  treatments.ts              # Treatment detail descriptions, steps, advantages, FAQ
  firebase.ts                # Firebase 클라이언트 초기화 (Firestore)
  fonts.ts                   # Local font config (Pretendard, Noto Serif KR)
  jsonld.ts                  # JSON-LD generators: clinic, treatment, FAQ, blog post, breadcrumb
  blog/
    types.ts                 # BlogPost, BlogPostMeta 인터페이스, 카테고리/태그 상수
    category-colors.ts       # 카테고리별 색상 매핑 (목록/상세 공유)
    index.ts                 # re-export + getPostBySlug() + 진료↔블로그 매핑
    generated/               # 자동 생성 (gitignored) — pnpm generate-blog-meta
      posts-meta.ts          # BLOG_POSTS_META 배열 (포스트 파일에서 자동 추출)
    posts/                   # 개별 포스트 파일 (78개, slug.ts 형식) — Single Source of Truth
public/
  fonts/                     # Local font files (woff2)
  images/                    # Clinic and doctor images
  BingSiteAuth.xml           # Bing webmaster verification
  naver*.html                # Naver webmaster verification
  7d01a83d...*.txt           # IndexNow API 키 파일
scripts/
  generate-blog-meta.ts      # 빌드 시 포스트 파일에서 메타데이터 자동 추출 스크립트
  submit-indexnow.mjs        # IndexNow URL 제출 스크립트 (Node.js 내장 모듈만 사용)
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
- **Server/Client split**: Pages default to server components. Components needing interactivity (`"use client"`): Header, FloatingCTA, KakaoMap, BlogContent, BlogShareButton, LikeButton, Contact form, Motion wrappers. Footer는 서버 컴포넌트.
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
| `/blog` | SSG | Static (metadata from `lib/blog/index.ts`) |
| `/blog/[slug]` | SSG | `generateStaticParams()` for 78 blog posts |
| `/contact` | Client-side | `"use client"` 전화 상담 안내 페이지 |
| `/sitemap.xml` | Force Static | `export const dynamic = "force-static"` |
| `/robots.txt` | Force Static | `export const dynamic = "force-static"` |

### 블로그 예약 발행 메커니즘

미래 날짜(`date` 필드)를 가진 포스트는 다음 두 곳에서 필터링되어 노출되지 않음:

1. **클라이언트 필터링** (`BlogContent.tsx`): `date <= today` 조건으로 미발행 포스트 제외
2. **Sitemap 필터링** (`app/sitemap.ts`): 동일 조건으로 미발행 포스트 sitemap에서 제외

블로그 목록 표시 전략 (SSR/CSR 이중 전략):
- **SSR 초기 렌더**: 최신순 정렬 (검색엔진 크롤러 일관성)
- **클라이언트 hydration 후**: Fisher-Yates 셔플로 랜덤 순서 표시 (콘텐츠 다양성)
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

### Firebase 클라이언트 (`lib/firebase.ts`)

- 최소 설정: `apiKey` + `projectId`만 사용 (Auth, Storage 등 미사용)
- `isFirebaseConfigured` boolean export: API key 미설정 시 Firestore 의존 기능(좋아요)을 graceful하게 비활성화
- 기본 projectId: `"seoul-born2smile"` (환경 변수 없으면 폴백)
- 싱글톤 패턴: 이미 초기화된 앱이 있으면 재사용

## Common Tasks

### 진료 과목 추가

1. `lib/constants.ts` → `TREATMENTS` 배열에 항목 추가 (`id`, `name`, `shortDesc`, `icon`, `href`)
2. `lib/treatments.ts` → `TREATMENT_DETAILS`에 상세 데이터 추가 (`TreatmentDetail` 인터페이스: `id`, `name`, `subtitle`, `description`, `steps[]`, `advantages[]`, `faq[]`)
3. `app/treatments/[slug]/page.tsx`의 `generateStaticParams()`가 자동으로 새 페이지 생성

### 블로그 포스트 추가

**포스트 파일 1개만 생성하면 끝** (메타데이터는 빌드 시 자동 추출):

1. `lib/blog/posts/` → 새 파일 생성 (`slug-name.ts`, `BlogPost` 인터페이스 준수)
   - `import type { BlogPost } from "../types";` + `export const post: BlogPost = { ... };`
   - `title`: 훅(호기심 유발) 문구, `subtitle`: 설명적 부제 — 2줄 구조로 표시
2. `pnpm dev` 또는 `pnpm build` 실행 시 메타데이터가 자동 생성됨
   - 수동 재생성: `pnpm generate-blog-meta`
   - 생성 파일: `lib/blog/generated/posts-meta.ts` (gitignored)
3. ~~`lib/blog/index.ts` 수동 등록 불필요~~ — `getPostBySlug()`가 동적 import로 자동 탐색
4. 카테고리(진료 분야별, 1개 선택): `"예방·구강관리" | "보존치료" | "보철치료" | "임플란트" | "치아교정" | "소아치료" | "구강건강상식"`
5. 태그(콘텐츠 유형 + 대상, 복수 선택): `BLOG_TAGS` 배열(`lib/blog/types.ts`)에 정의된 7개 태그 중 선택
   - 유형 태그: `"치료후관리"`, `"생활습관"`, `"팩트체크"`, `"증상가이드"`, `"비교가이드"`
   - 대상 태그: `"임산부"`, `"시니어"`
6. 새 카테고리 추가 시 `lib/blog/types.ts`의 `BLOG_CATEGORIES`와 `BlogCategoryValue` 타입도 함께 수정
7. 새 태그 추가 시 `lib/blog/types.ts`의 `BLOG_TAGS` 배열에 추가
8. 블로그 목록은 접속 시마다 랜덤 순서로 표시됨 (클라이언트 측 셔플, 12개씩 페이지네이션)

### 병원 정보 수정

`lib/constants.ts`의 해당 상수만 수정하면 사이트 전체에 반영:

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
- `firestore.rules` — Firestore 보안 규칙: `blog-likes/{slug}` 컬렉션만 read/write 허용 (count, users 필드), 나머지 전체 차단
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
- `NEXT_PUBLIC_FIREBASE_API_KEY` — Firebase Web API Key (required for Firestore 좋아요 기능)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` — Firebase Project ID (default: `seoul-born2smile`)

## Known TODO Items

코드에 남아있는 미완료 항목:

- `lib/constants.ts`: SNS 링크(`LINKS` — 카카오, 인스타, 네이버블로그, 지도 링크) — 현재 빈 문자열
- ~~`lib/constants.ts`: 지도 좌표(`MAP`) 정확도 확인 필요~~ — 해결: 카카오맵 주소 기반 geocoding이 정상 동작하므로 하드코딩 좌표는 폴백용으로만 사용
- `app/contact/page.tsx`: 온라인 예약 시스템 미구축 — 현재 전화 상담 안내 페이지로 운영 중. 향후 온라인 예약 시스템 도입 시 폼 추가 필요
- `hosting-redirect/`: Naver 웹마스터 인증 파일만 존재 — `firebase.json`의 regex redirect로 처리 중

### SEO 개선 TODO

**High — 외부 링크 연동:**

- `lib/constants.ts` `LINKS`: SNS 링크(카카오, 인스타, 네이버블로그, 지도 링크) — 현재 빈 문자열. 채우면 Footer 아이콘, Contact 페이지 카카오 상담 버튼, `getClinicJsonLd()`의 `sameAs`에 자동 반영

**Medium — 추가 최적화:**

- ~~`lib/jsonld.ts` `getBlogPostJsonLd()`: `dateModified`가 `datePublished`와 동일~~ — 해결: `BlogPostMeta`에 `dateModified?: string` 필드 추가, `getBlogPostJsonLd()`에서 `post.dateModified ?? post.date`로 처리. 포스트 파일에 `dateModified` 필드를 추가하면 자동 반영됨
- ~~시설 사진 섹션: 현재 홈페이지에서 숨김 처리됨~~ — 해결: `app/page.tsx`에 시설 안내 섹션 표시 중, `public/images/facility/`에 6장(진료실, 대기실, 상담실, VIP실, X-ray실, 외관) 포함
