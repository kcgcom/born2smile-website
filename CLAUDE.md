# CLAUDE.md

## Project Overview

Dental clinic website for "서울본치과" (Seoul Born Dental Clinic) in Gimpo, South Korea. Full-stack Next.js app deployed to Firebase App Hosting (Cloud Build + Cloud Run + Cloud CDN).

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript (strict mode)
- **Styling**: Tailwind CSS 4, CSS custom properties in `app/globals.css`
- **Animation**: Framer Motion (`components/ui/Motion.tsx` provides `<FadeIn>`, `<StaggerContainer>`, `<StaggerItem>`)
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

## Project Structure

```
app/                    # Next.js App Router pages
  layout.tsx            # Root layout (header, footer, floating CTA)
  page.tsx              # Homepage
  about/page.tsx        # Clinic info page
  treatments/           # Treatment pages
    page.tsx            # Treatment listing
    [slug]/page.tsx     # Individual treatment (6 dynamic routes)
  blog/page.tsx         # Blog/announcements
  contact/page.tsx      # Booking/inquiry form
  globals.css           # Global styles and design tokens
  robots.ts             # robots.txt generation
  sitemap.ts            # Sitemap generation
components/
  layout/               # Header, Footer, FloatingCTA
  ui/                   # Motion (animations), KakaoMap
lib/
  constants.ts          # Single source of truth: clinic info, hours, treatments, navigation
  treatments.ts         # Detailed treatment descriptions and FAQ data
  fonts.ts              # Local font config (Pretendard, Noto Serif KR)
  jsonld.ts             # JSON-LD structured data generators
public/fonts/           # Local font files
apphosting.yaml         # Firebase App Hosting runtime config
```

## Architecture

- **Standalone mode**: `output: "standalone"` — Cloud Run에서 Node.js 서버로 실행. SSR, API Routes, Middleware, ISR, `next/image` 최적화 모두 사용 가능.
- **Static + Dynamic**: `generateStaticParams()`로 빌드 시점 정적 생성 + 필요 시 SSR/ISR 혼용 가능.
- **Data centralization**: `lib/constants.ts` is the single source of truth for clinic name, address, hours, doctor info, treatments, and nav items. Update data there, not in individual pages.
- **Server/Client split**: Pages default to server components. Components needing interactivity (`"use client"`): Header, Footer, FloatingCTA, KakaoMap, Contact form, Motion wrappers.
- **SEO**: JSON-LD schemas (`lib/jsonld.ts`), Next.js Metadata API, sitemap, robots.txt. All content is Korean-language and SEO-optimized for local dental search terms.

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

커스텀 유틸리티 클래스:

- `.section-padding` — 섹션 공통 패딩 (`px-4 py-16` ~ `lg:px-8 lg:py-32`)
- `.container-narrow` — 최대 너비 컨테이너 (`max-w-6xl mx-auto`)
- `.font-headline` — 세리프 헤드라인 폰트 (Noto Serif KR)

## Common Tasks

### 진료 과목 추가

1. `lib/constants.ts` → `TREATMENTS` 배열에 항목 추가 (`id`, `name`, `shortDesc`, `href`)
2. `lib/treatments.ts` → `TREATMENT_DETAILS`에 상세 데이터 추가 (`TreatmentDetail` 인터페이스 준수)
3. `app/treatments/[slug]/page.tsx`의 `generateStaticParams()`가 자동으로 새 페이지 생성

### 병원 정보 수정

`lib/constants.ts`의 해당 상수만 수정하면 사이트 전체에 반영:

- `CLINIC` — 병원명, 주소, 전화번호
- `DOCTORS` — 의료진 정보
- `HOURS` — 진료시간
- `SEO` — 메타데이터, 키워드
- `LINKS` — SNS/외부 링크

## Code Conventions

- 2-space indentation
- Components: PascalCase (`Header.tsx`, `KakaoMap.tsx`)
- Constants: UPPER_SNAKE_CASE (`NAV_ITEMS`, `CLINIC`)
- Variables/functions: camelCase
- CSS variables: `--kebab-case`
- TypeScript: `interface` for props, explicit type annotations, strict mode enabled
- Path alias: `@/*` maps to project root
- Accessibility: semantic HTML, ARIA labels, skip links, `prefers-reduced-motion` support

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

- `apphosting.yaml` — Cloud Run 런타임 설정 (인스턴스 수, CPU, 메모리, 환경변수)
- 빌드는 Cloud Build에서 원격 실행 → 로컬 `next build` 불필요
- 정적 에셋(`.next/static`, `public/`)은 Cloud CDN에서 캐싱
- SSR/API Routes는 Cloud Run에서 처리, scale-to-zero 지원
- GitHub 연동 시 push → 자동 배포 가능

## Environment Variables

로컬 개발: `.env.example` → `.env.local`로 복사하여 사용.
프로덕션: `apphosting.yaml`의 `env` 섹션 + Cloud Secret Manager로 관리.

- `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` — Kakao Maps JavaScript App Key (required for map component)

## No Test Suite

There is no testing framework configured. No test commands are available.
