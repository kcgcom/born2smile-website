# CLAUDE.md

## Project Overview

Dental clinic website for "서울본치과" (Seoul Born Dental Clinic) in Gimpo, South Korea. Full-stack Next.js app deployed to Firebase App Hosting (Cloud Build + Cloud Run + Cloud CDN).

- **Site URL**: `https://www.born2smile.co.kr`
- **Firebase Site**: `seoul-born2smile` (Firebase Hosting redirects to App Hosting)

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router, React 19.2.3, TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 (inline `@theme` in `globals.css`), CSS custom properties
- **Animation**: Framer Motion 12 (`components/ui/Motion.tsx` provides `<FadeIn>`, `<StaggerContainer>`, `<StaggerItem>`)
- **Icons**: Lucide React
- **Maps**: Kakao Maps SDK (async loaded)
- **Package Manager**: pnpm
- **Deployment**: Firebase App Hosting (`output: "standalone"` in `next.config.ts`, Cloud Run 기반)

## Getting Started

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_KAKAO_MAP_APP_KEY 입력
pnpm dev                      # http://localhost:3000
```

## Commands

- `pnpm dev` — Start dev server
- `pnpm build` — Production build (standalone output to `.next/`)
- `pnpm lint` — Run ESLint
- `pnpm deploy` — Deploy to Firebase App Hosting (빌드는 Cloud Build에서 원격 실행)

## No Test Suite

There is no testing framework configured. No test commands are available.

## Project Structure

```
app/                          # Next.js App Router pages
  layout.tsx                  # Root layout (header, footer, floating CTA, JSON-LD)
  page.tsx                    # Homepage (hero, values, treatments, doctor, map, CTA)
  globals.css                 # Design tokens, @theme inline, utility classes
  robots.ts                   # robots.txt generation (force-static)
  sitemap.ts                  # Sitemap XML generation (force-static)
  about/page.tsx              # Clinic info, doctor bio, facility, hours
  treatments/
    page.tsx                  # Treatment listing (6 cards)
    [slug]/page.tsx           # Individual treatment detail (generateStaticParams)
  blog/page.tsx               # Blog hub (delegates to BlogContent)
  contact/
    layout.tsx                # Contact layout wrapper with metadata
    page.tsx                  # 전화 상담 안내 + 오시는 길 ("use client")
components/
  layout/               # Header, Footer, FloatingCTA
  ui/                   # Motion (animations), KakaoMap
lib/
  constants.ts               # Single source of truth: clinic info, hours, treatments, nav, SEO
  treatments.ts              # Treatment detail descriptions, steps, advantages, FAQ
  blog-posts.ts              # Blog post data (10 posts) and categories
  fonts.ts                   # Local font config (Pretendard, Noto Serif KR)
  jsonld.ts                  # JSON-LD generators: clinic, treatment, FAQ, breadcrumb
public/
  fonts/                     # Local font files (woff2)
  images/                    # Clinic and doctor images
hosting-redirect/
  index.html                 # Firebase Hosting → App Hosting redirect page
apphosting.yaml              # Firebase App Hosting runtime config
firebase.json                # Firebase project config (Hosting redirect + App Hosting)
postcss.config.mjs           # PostCSS with @tailwindcss/postcss
```

## Architecture

- **Standalone mode**: `output: "standalone"` — Cloud Run에서 Node.js 서버로 실행. SSR, API Routes, Middleware, ISR, `next/image` 최적화 모두 사용 가능.
- **Static + Dynamic**: `generateStaticParams()`로 빌드 시점 정적 생성 + 필요 시 SSR/ISR 혼용 가능.
- **Data centralization**: `lib/constants.ts` is the single source of truth for clinic name, address, hours, doctor info, treatments, and nav items. Update data there, not in individual pages.
- **Server/Client split**: Pages default to server components. Components needing interactivity (`"use client"`): Header, Footer, FloatingCTA, KakaoMap, Contact form, Motion wrappers.
- **SEO**: JSON-LD schemas (`lib/jsonld.ts`), Next.js Metadata API, sitemap, robots.txt. All content is Korean-language and SEO-optimized for local dental search terms.

### Rendering Strategy

| Page | Rendering | Notes |
|------|-----------|-------|
| `/` | SSG | Static at build time |
| `/about` | SSG | Static |
| `/treatments` | SSG | Static |
| `/treatments/[slug]` | SSG | `generateStaticParams()` for 6 slugs |
| `/blog` | SSG | Static (blog data in `lib/blog-posts.ts`) |
| `/contact` | Client-side | `"use client"` 전화 상담 안내 페이지 |
| `/sitemap.xml` | Force Static | `export const dynamic = "force-static"` |
| `/robots.txt` | Force Static | `export const dynamic = "force-static"` |

### Font System

`next/font/local`로 로컬 폰트를 로드하고 CSS 변수로 연결:

| Font | CSS Variable | Usage |
|------|-------------|-------|
| Pretendard Variable | `--font-pretendard` | 본문 기본 (`font-sans`) |
| Noto Serif KR (400, 700) | `--font-noto-serif` | 헤드라인 (`font-serif`, `.font-headline`) |

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

## Common Tasks

### 진료 과목 추가

1. `lib/constants.ts` → `TREATMENTS` 배열에 항목 추가 (`id`, `name`, `shortDesc`, `icon`, `href`)
2. `lib/treatments.ts` → `TREATMENT_DETAILS`에 상세 데이터 추가 (`TreatmentDetail` 인터페이스: `id`, `name`, `subtitle`, `description`, `steps[]`, `advantages[]`, `faq[]`)
3. `app/treatments/[slug]/page.tsx`의 `generateStaticParams()`가 자동으로 새 페이지 생성

### 블로그 포스트 추가

1. `lib/blog-posts.ts` → `BLOG_POSTS` 배열에 항목 추가 (`BlogPost` 인터페이스 준수)
2. 카테고리는 `"구강관리" | "예방치료" | "치아상식" | "생활습관"` 중 선택
3. 새 카테고리 추가 시 `BLOG_CATEGORIES` 배열과 `BlogPost` 타입도 함께 수정

### 병원 정보 수정

`lib/constants.ts`의 해당 상수만 수정하면 사이트 전체에 반영:

- `CLINIC` — 병원명, 주소, 전화번호, 대표자
- `DOCTORS` — 의료진 정보 (학력, 자격, 학회, 현직)
- `HOURS` — 진료시간 (요일별 시간, 점심시간, 휴진일)
- `TREATMENTS` — 진료 과목 목록 (id, name, shortDesc, icon, href)
- `SEO` — 메타데이터, 키워드 (24개 로컬 SEO 키워드)
- `LINKS` — SNS/외부 링크 (카카오, 인스타, 네이버, 지도)
- `MAP` — 네이버 지도 좌표 및 줌 레벨
- `BASE_URL` — 사이트 기본 URL

### JSON-LD 구조화 데이터

`lib/jsonld.ts`에서 4종의 JSON-LD 스키마 생성:

- `getClinicJsonLd()` — Dentist + LocalBusiness (홈, 소개 페이지)
- `getTreatmentJsonLd(id)` — MedicalWebPage (진료 상세 페이지)
- `getFaqJsonLd(faq)` — FAQPage (FAQ가 있는 진료 상세 페이지)
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
- 빌드는 Cloud Build에서 원격 실행 → 로컬 `next build` 불필요
- 정적 에셋(`.next/static`, `public/`)은 Cloud CDN에서 캐싱
- SSR/API Routes는 Cloud Run에서 처리, scale-to-zero 지원
- GitHub 연동 시 push → 자동 배포 가능

## Environment Variables

로컬 개발: `.env.example` → `.env.local`로 복사하여 사용.
프로덕션: `apphosting.yaml`의 `env` 섹션 + Cloud Secret Manager로 관리.

- `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` — Kakao Maps JavaScript App Key (required for map component)

## Known TODO Items

코드에 남아있는 미완료 항목:

- `lib/constants.ts`: SNS 링크(`LINKS` — 카카오, 인스타, 네이버블로그, 지도 링크)
- `app/contact/page.tsx`: 온라인 예약 시스템 미구축 — 현재 전화 상담 안내 페이지로 운영 중. 향후 온라인 예약 시스템 도입 시 폼 추가 필요
- `app/layout.tsx`: Google Search Console / Naver Search Advisor 인증 코드
