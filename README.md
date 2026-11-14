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
pnpm install --frozen-lockfile
# .env.local이 없을 때만 실행하고, docs/environment-variables.md에 따라 값을 설정합니다.
cp -n .env.example .env.local
pnpm dev  # http://localhost:3000
```

개발/빌드는 Supabase 데이터를 읽어 생성 파일을 갱신합니다. 빌드는 최신 블로그 스냅샷을 필수로 요구하므로 Supabase 환경변수와 네트워크 접근이 필요합니다. 정확한 도구 버전과 실행 순서는 [package.json](package.json)을 기준으로 합니다.

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 블로그·연구·택소노미 스냅샷과 메타데이터·개발 매니페스트 생성 후 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 (빌드 직전 생성한 블로그 snapshot 기준으로 공개 페이지 정적 생성) |
| `pnpm start` | 로컬 프로덕션 서버 |
| `pnpm exec tsc --noEmit` | TypeScript 검사 |
| `pnpm lint` | ESLint 실행 |
| `pnpm test:e2e` | tests/의 Playwright 전체 테스트 |
| `pnpm submit-indexnow` | 오늘 발행분 IndexNow 제출 |
| `pnpm submit-indexnow:all` | 전체 URL IndexNow 제출 |

> `pnpm deploy`는 안내 후 종료 코드 1로 끝나며 실제 배포하지 않습니다. 차단 동작 검증에는 사용할 수 있습니다. 운영 배포 승인과 허용 경로는 [AGENTS.md](AGENTS.md#배포와-데이터)를 따릅니다.

## 프로젝트 구조

```text
app/                  # Next.js App Router 페이지/라우트
  admin/              # 운영·분석·콘텐츠·시스템 경로 기반 관리자 화면
  api/                # API Routes (GA4, Search Console, PostHog, 블로그 CRUD 등)
  blog/               # 블로그 (카테고리/슬러그 계층 구조)
  treatments/         # 진료 과목 (6개)
components/           # React 컴포넌트 (blog/admin/layout/ui/analytics/research)
hooks/                # 공유 훅 (인증 상태, 발행 팝업, 모달 접근성)
lib/                  # 비즈니스 로직, API 클라이언트, 상수
  blog/               # 블로그 타입·카테고리·자동 생성 스냅샷
  constants.ts        # 병원 정보 코드 기본값 (운영 설정이 덮어쓸 수 있음)
docs/                 # 운영/콘텐츠/인프라 문서
scripts/              # 빌드/마이그레이션/IndexNow 스크립트
```

## 문서

| 문서 | 내용 |
|------|------|
| [AGENTS.md](AGENTS.md) | 공통 작업·검증·배포 규칙과 하위 지침 안내 |
| [CLAUDE.md](CLAUDE.md) | Claude Code용 지침 진입점 |
| [DESIGN.md](DESIGN.md) | UI 디자인 기준 |
| [docs/environment-variables.md](docs/environment-variables.md) | 환경변수 목록 및 설정 가이드 |
| [docs/supabase-architecture.md](docs/supabase-architecture.md) | Supabase 테이블/RLS/RPC/캐싱 구조 |
| [docs/blog-workflow.md](docs/blog-workflow.md) | 블로그 발행 워크플로우 |
| [docs/blog-writing-guide.md](docs/blog-writing-guide.md) | 블로그 작성 가이드 |
| [docs/source-link-policy.md](docs/source-link-policy.md) | 콘텐츠 출처·인용 정책 |
| [docs/question-feedback-rollout.md](docs/question-feedback-rollout.md) | 질문 해결 피드백, 관리자 응답 제외, DB 전환 및 배포 상태 |
| [docs/customer-analytics-card-measurement.md](docs/customer-analytics-card-measurement.md) | 글 카드 노출·클릭 측정 기준 |
| [docs/customer-analytics-measurement-contract.md](docs/customer-analytics-measurement-contract.md) | 읽기 측정 계약과 초기 설계 이력 |
| [docs/opportunity-scoring.md](docs/opportunity-scoring.md) | 콘텐츠 기회 점수 모델 |
| [docs/content-coverage-retrieval-evaluation.md](docs/content-coverage-retrieval-evaluation.md) | 검색 평가 기준선과 운영 검토 흐름 |
| [docs/designs/keyword-candidate-recommendation-v2.md](docs/designs/keyword-candidate-recommendation-v2.md) | 키워드 후보 shadow 평가 설계·구현 이력 |

## 배포

GitHub → Vercel 연동을 사용합니다. 로컬 커밋 자체는 원격 배포를 시작하지 않습니다.

1. 브랜치 push·PR → Vercel 설정에 따라 Preview 배포 생성 가능
2. 승인된 `main` push 또는 merge → Vercel Production 배포
3. Vercel Cron: KST 00:05 블로그 캐시 재검증, 00:20 색인 상태 검사, 00:35 검색 데이터 수집 (`vercel.json`)
4. 블로그 cron은 당일 발행 글을 조회해 캐시를 재검증하고, `INDEXNOW_KEY`가 설정되면 URL을 제출합니다. 새 배포를 생성하거나 글의 published 값을 바꾸는 작업은 아닙니다.

`pnpm deploy` 차단은 로컬 npm 스크립트의 실수 방지 장치입니다. 직접 Vercel CLI나 대시보드 실행 권한까지 제한하지 않으므로, 이를 이용해 Git 배포 정책을 우회하지 않습니다.

개선 항목은 [lib/admin-data.ts](lib/admin-data.ts)의 `IMPROVEMENT_ITEMS`와 `/admin/system/devtools/project`에서 관리합니다. 별도 TODO 목록은 중복 유지하지 않습니다.

## 라이선스

Private repository. All rights reserved.
