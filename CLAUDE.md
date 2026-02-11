# CLAUDE.md

## Project Overview

Dental clinic website for "서울본치과" (Seoul Born Dental Clinic) in Gimpo, South Korea. Static site built with Next.js App Router and deployed to Firebase Hosting.

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript (strict mode)
- **Styling**: Tailwind CSS 4, CSS custom properties in `app/globals.css`
- **Animation**: Framer Motion (`components/ui/Motion.tsx` provides `<FadeIn>`, `<StaggerContainer>`, `<StaggerItem>`)
- **Icons**: Lucide React
- **Maps**: Kakao Maps SDK (async loaded)
- **Package Manager**: pnpm
- **Deployment**: Firebase Hosting (static export via `output: "export"` in `next.config.ts`)

## Commands

- `pnpm dev` — Start dev server
- `pnpm build` — Production build (static export to `/out`)
- `pnpm lint` — Run ESLint
- `pnpm deploy` — Build + deploy to Firebase Hosting
- `pnpm deploy:preview` — Build + deploy to Firebase preview channel

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
```

## Architecture

- **Static generation**: All pages are statically exported at build time. Treatment detail pages use `generateStaticParams()`.
- **Data centralization**: `lib/constants.ts` is the single source of truth for clinic name, address, hours, doctor info, treatments, and nav items. Update data there, not in individual pages.
- **Server/Client split**: Pages default to server components. Components needing interactivity (`"use client"`): Header, Footer, FloatingCTA, KakaoMap, Contact form, Motion wrappers.
- **SEO**: JSON-LD schemas (`lib/jsonld.ts`), Next.js Metadata API, sitemap, robots.txt. All content is Korean-language and SEO-optimized for local dental search terms.

## Code Conventions

- 2-space indentation
- Components: PascalCase (`Header.tsx`, `KakaoMap.tsx`)
- Constants: UPPER_SNAKE_CASE (`NAV_ITEMS`, `CLINIC`)
- Variables/functions: camelCase
- CSS variables: `--kebab-case`
- TypeScript: `interface` for props, explicit type annotations, strict mode enabled
- Path alias: `@/*` maps to project root
- Accessibility: semantic HTML, ARIA labels, skip links, `prefers-reduced-motion` support
- Commit messages in Korean, prefixed with conventional commit types (`feat:`, `fix:`)

## Environment Variables

Copy `.env.example` to `.env.local`:

- `NEXT_PUBLIC_KAKAO_MAP_KEY` — Kakao Maps JavaScript API key (required for map component)

## No Test Suite

There is no testing framework configured. No test commands are available.
