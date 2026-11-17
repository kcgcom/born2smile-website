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

로컬 네트워크 개발은 OPNsense DNS와 os-caddy를 공통 HTTPS 진입점으로 사용합니다. 프로젝트마다 도메인과 포트를 고정하고, DNS는 Caddy 서버로, Caddy는 해당 개발 PC의 프로젝트 포트로 연결합니다.

```bash
pnpm dev:lan  # HTTP 0.0.0.0:3000, Caddy upstream용
```

이 프로젝트는 3000번 포트를 사용하며, 사용 중이면 다른 포트로 자동 이동하지 않고 종료합니다. 다른 프로젝트는 별도 포트를 사용합니다. 개발 PC는 DHCP 예약으로 IP를 고정합니다. 요청에 따라 개발 포트 전용 Windows 방화벽 제한은 사용하지 않으며 기존 Windows 방화벽 정책을 따릅니다. Caddy의 개발 도메인 접근은 LAN 대역으로 제한합니다. 개발 서버를 실행하면 기존 방화벽이 허용하는 LAN 기기에서 포트로 직접 접속할 수 있습니다.

접속 주소는 `https://born2smile.dev.born2smile.co.kr`입니다. OPNsense/Caddy 서버는 `192.168.1.1`, 개발 PC는 `192.168.1.222`, 이 프로젝트의 Caddy upstream은 `http://192.168.1.222:3000`입니다. eunkyo 프로젝트는 `https://eunkyo.dev.born2smile.co.kr`과 3002번 포트를 사용합니다.

LAN 기기는 OPNsense를 DNS로 사용해야 합니다. AdGuard Home의 업스트림에는 `[/dev.born2smile.co.kr/]127.0.0.1:5353`을 추가해 개발 도메인 질의를 Unbound로 전달하고, Unbound의 호스트 재정의는 두 도메인을 `192.168.1.1`로 응답합니다. Caddy는 DNS-01로 발급한 HTTPS 인증서와 `192.168.1.0/24` 접근 목록을 사용합니다. WAN 공개나 포트포워딩은 추가하지 않습니다. Tailscale Serve 전용 명령은 제거했으며 Tailscale VPN 클라이언트 사용 여부와는 별개입니다.

개발 서버를 종료하거나 PC를 재시작하면 `pnpm dev:lan`을 다시 실행해야 합니다. DNS와 인증서가 정상이지만 502가 표시되면 개발 서버 실행 여부와 upstream IP·포트를 확인합니다.

개발/빌드는 Supabase 데이터를 읽어 생성 파일을 갱신합니다. 빌드는 최신 블로그 스냅샷을 필수로 요구하므로 Supabase 환경변수와 네트워크 접근이 필요합니다. 정확한 도구 버전과 실행 순서는 [package.json](package.json)을 기준으로 합니다.

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 블로그·연구·택소노미 스냅샷과 메타데이터·개발 매니페스트 생성 후 개발 서버 실행 |
| `pnpm dev:lan` | 공통 Caddy에서 프록시할 LAN 개발 서버, 고정 포트 3000 |
| `pnpm build` | 프로덕션 빌드 (빌드 직전 생성한 블로그 snapshot 기준으로 공개 페이지 정적 생성) |
| `pnpm start` | 로컬 프로덕션 서버 |
| `pnpm exec tsc --noEmit` | TypeScript 검사 |
| `pnpm lint` | ESLint 실행 |
| `pnpm test:e2e` | tests/의 Playwright 전체 테스트 |
| `pnpm agent:context --target /treatments/implant --period 90d` | 에이전트 분석 자료 수집 (부분 수집·offline은 종료 코드 2) |
| `pnpm verify:agent-context` | 외부 호출 없이 수집 계약 검증 |
| `pnpm agent:revision --file .tmp/proposal.json --check` | 검토용 수정안 입력 검증. `--check` 생략 시 수정안만 저장 |
| `pnpm verify:content-revisions` | 수정안·원본 버전·에이전트 권한 계약 검증 (실제 DB 실행 별도) |
| `pnpm verify:content-revisions-db` | 임시 PostgreSQL 엔진으로 마이그레이션·충돌·롤백·권한 검증 (임시 의존성 준비 필요) |
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
| [docs/agent-content-workflow.md](docs/agent-content-workflow.md) | 에이전트 자료 수집과 분석·보강 절차 |
| [docs/blog-writing-guide.md](docs/blog-writing-guide.md) | 블로그 작성 가이드 |
| [docs/source-link-policy.md](docs/source-link-policy.md) | 콘텐츠 출처·인용 정책 |
| [docs/question-feedback-rollout.md](docs/question-feedback-rollout.md) | 질문 해결 피드백, 관리자 응답 제외, DB 전환 및 배포 상태 |
| [docs/admin-post-performance.md](docs/admin-post-performance.md) | 포스트 성과 패널과 운영 개요의 정보 구성·집계 기준 |
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
