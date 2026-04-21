# 서울본치과 웹사이트

김포 서울본치과 공식 웹사이트. Next.js 기반 풀스택 앱으로, Vercel에 배포됩니다.

- **사이트**: https://www.born2smile.co.kr

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16, React 19, TypeScript 5 (strict) |
| 스타일링 | Tailwind CSS 4, CSS custom properties |
| 데이터베이스 | Supabase (PostgreSQL with RLS) |
| 인증 | Supabase Auth (Google 로그인, 관리자 전용) |
| 분석 | GA4 Data API, Search Console API, 네이버 DataLab/검색광고 API, PostHog |
| 모니터링 | Sentry |
| 배포 | Vercel (Edge Network + Serverless Functions) |
| 패키지 매니저 | pnpm |

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # 환경변수 설정 (docs/environment-variables.md 참조)
pnpm dev                     # http://localhost:3000
```

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 (블로그 snapshot/meta/dev manifest 생성 후, 공개 블로그는 snapshot 기준으로 실행) |
| `pnpm build` | 프로덕션 빌드 (빌드 직전 생성한 블로그 snapshot 기준으로 공개 페이지 정적 생성) |
| `pnpm start` | 로컬 프로덕션 서버 |
| `pnpm lint` | ESLint 실행 |
| `pnpm test:e2e` | Playwright 스모크 테스트 |
| `pnpm submit-indexnow` | 오늘 발행분 IndexNow 제출 |
| `pnpm submit-indexnow:all` | 전체 URL IndexNow 제출 |

> `pnpm deploy` / `vercel --prod`는 이 저장소에서 운영 정책상 사용하지 않습니다. 프로덕션 배포는 `main` push로만 진행합니다.

## 프로젝트 구조

```text
app/                  # Next.js App Router 페이지/라우트
  admin/              # 관리자 대시보드 (대시보드/콘텐츠/유입·SEO/전환/사이트 설정/개발도구)
  api/                # API Routes (GA4, Search Console, PostHog, 블로그 CRUD 등)
  blog/               # 블로그 (카테고리/슬러그 계층 구조)
  treatments/         # 진료 과목 (6개)
components/           # React 컴포넌트 (blog/, admin/, layout/, ui/)
hooks/                # 공유 훅 (인증, 발행 팝업)
lib/                  # 비즈니스 로직, API 클라이언트, 상수
  blog/               # 블로그 타입, 카테고리, 포스트 파일
  constants.ts        # 병원 정보 Single Source of Truth
docs/                 # 운영/콘텐츠/인프라 문서
scripts/              # 빌드/마이그레이션/IndexNow 스크립트
```

## 문서

| 문서 | 내용 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | 프로젝트 전체 지침 (AI 도구용, 아키텍처/컨벤션/태스크 상세) |
| [docs/environment-variables.md](docs/environment-variables.md) | 환경변수 목록 및 설정 가이드 |
| [docs/supabase-architecture.md](docs/supabase-architecture.md) | Supabase 테이블/RLS/RPC/캐싱 구조 |
| [docs/blog-workflow.md](docs/blog-workflow.md) | 블로그 발행 워크플로우 |
| [docs/blog-writing-guide.md](docs/blog-writing-guide.md) | 블로그 작성 가이드 |
| [docs/admin-ux-checklist.md](docs/admin-ux-checklist.md) | `/admin` 운영 점검 체크리스트 |
| [docs/llm-gateway-cloudflare-setup.md](docs/llm-gateway-cloudflare-setup.md) | AI 작성 도우미 게이트웨이 운영 가이드 |
| [docs/todo.md](docs/todo.md) | 현재 남아 있는 개선 과제 |

## 배포

Vercel로 자동 배포됩니다.

1. GitHub PR → Vercel Preview 배포
2. `main` push → Vercel Production 배포
3. 매일 KST 00:05 Vercel Cron이 `/api/cron/rebuild`를 호출해 예약 포스트 공개/재검증 수행
4. `INDEXNOW_KEY`가 설정되어 있으면 재검증 시 변경 URL을 IndexNow에도 함께 제출

## 라이선스

Private repository. All rights reserved.
