# Environment Variables

로컬 개발은 `.env.example`를 `.env.local`로 복사해서 사용합니다.
프로덕션/프리뷰는 Vercel Dashboard → Settings → Environment Variables에서 관리합니다.

## 빠른 기준

- **필수 코어**: Supabase, 관리자 이메일
- **기능별 선택**: GA4 / Search Console / Naver / PageSpeed / PostHog / Sentry / LLM gateway
- **운영 자동화**: `CRON_SECRET`, `INDEXNOW_KEY`

## 변수 목록

| 변수 | 용도 | 필요 시점 |
|------|------|-----------|
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | Kakao Maps SDK | 연락처/지도 노출 시 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 필수 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Admin key | 필수 |
| `ADMIN_EMAILS` | 관리자 이메일 화이트리스트 | 필수 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | GA4/Search Console 서버 인증 JSON | GA4/SC 사용 시 |
| `GA4_PROPERTY_ID` | GA4 속성 ID | 유입·SEO > 트래픽 사용 시 |
| `SEARCH_CONSOLE_SITE_URL` | Search Console 속성 URL | 유입·SEO > 검색 성과 사용 시 |
| `NAVER_DATALAB_CLIENT_ID` | DataLab Client ID | 트렌드 사용 시 |
| `NAVER_DATALAB_CLIENT_SECRET` | DataLab Client Secret | 트렌드 사용 시 |
| `NAVER_SEARCHAD_API_KEY` | 검색광고 API Key | 절대 검색량 사용 시 |
| `NAVER_SEARCHAD_SECRET_KEY` | 검색광고 Secret Key | 절대 검색량 사용 시 |
| `NAVER_SEARCHAD_CUSTOMER_ID` | 검색광고 고객 ID | 절대 검색량 사용 시 |
| `PAGESPEED_API_KEY` | PageSpeed Insights API 키 | 개발도구 > 성능 사용 시 |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry 클라이언트 DSN | 에러 모니터링 사용 시 |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | 공개 환경명 | Sentry 사용 시 |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | 클라이언트 trace 샘플링 | Sentry 사용 시 |
| `SENTRY_ENVIRONMENT` | 서버 환경명 | Sentry 사용 시 |
| `SENTRY_ORG` | Sentry org slug | 릴리즈/모니터링 연동 시 |
| `SENTRY_PROJECT` | Sentry project slug | 릴리즈/모니터링 연동 시 |
| `SENTRY_AUTH_TOKEN` | Sentry auth token | 릴리즈/모니터링 연동 시 |
| `NEXT_PUBLIC_POSTHOG_TOKEN` | PostHog 웹 SDK 토큰 | 전환 측정 사용 시 |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest host | 전환 측정 사용 시 |
| `NEXT_PUBLIC_POSTHOG_UI_HOST` | PostHog UI host | 전환 리포트 링크 생성 시 |
| `POSTHOG_PROJECT_ID` | PostHog 프로젝트 ID | 전환 리포트 API 사용 시 |
| `POSTHOG_API_KEY` | PostHog query API key | 전환 리포트 API 사용 시 |
| `POSTHOG_BASE_URL` | PostHog API base URL | 전환 리포트 API 사용 시 |
| `LLM_BASE_URL` | AI 작성 도우미 gateway URL | AI 작성 도우미 사용 시 |
| `LLM_MODEL` | gateway에 전달할 기본 모델명 | AI 작성 도우미 사용 시 |
| `AI_OPS_AGENT_BASE_URL` | AI 운영실 전용 외부/사설 엔진 base URL | AI 운영실 원격 프록시 사용 시 |
| `AI_OPS_AGENT_SHARED_SECRET` | AI 운영실 프록시와 원격 엔진 간 공유 시크릿 | AI 운영실 원격 프록시 사용 시 |
| `AI_OPS_AGENT_SUGGESTION_TIMEOUT_MS` | AI 운영실 제안 생성 프록시 타임아웃(ms) | AI 운영실 원격 프록시 사용 시 선택 |
| `CLOUDFLARE_ACCESS_CLIENT_ID` | Cloudflare Access service token ID | 외부 gateway 보호 시 |
| `CLOUDFLARE_ACCESS_CLIENT_SECRET` | Cloudflare Access service token secret | 외부 gateway 보호 시 |
| `LLM_UPSTREAM_TIMEOUT_MS` | gateway 업스트림 타임아웃(ms) | 선택 |
| `CRON_SECRET` | `/api/cron/rebuild` 인증 토큰 | 예약 발행 자동화 시 필수 |
| `INDEXNOW_KEY` | IndexNow 제출 키 | 자동/수동 IndexNow 제출 시 권장 |

## 운영 자동화 메모

### Vercel Cron

- `vercel.json`의 스케줄이 매일 KST 00:05에 `/api/cron/rebuild`를 호출합니다.
- 요청 헤더의 `Authorization: Bearer <CRON_SECRET>`가 일치해야 동작합니다.

### IndexNow

- 서버 라우트(`lib/indexnow.ts`)는 `INDEXNOW_KEY`가 있을 때만 제출합니다.
- 공개 키 파일은 `public/<INDEXNOW_KEY>.txt` 형식으로 함께 존재해야 합니다.
- 수동 제출 스크립트는 `pnpm submit-indexnow`, `pnpm submit-indexnow:all`입니다.

## 기능별 메모

### 네이버 검색광고 API

- `hintKeywords`는 공백 없는 형태로 요청합니다. (`normalizeKeyword()`가 자동 처리)
- 일별/월간 성격의 데이터라 `24h` 캐시를 사용합니다.
- 시크릿 문자열에 trailing newline이 섞일 수 있어 `.trim()` 처리합니다.

### PostHog

- 브라우저 추적에는 `NEXT_PUBLIC_POSTHOG_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`가 필요합니다.
- 관리자 전환 리포트 API에는 `POSTHOG_PROJECT_ID`, `POSTHOG_API_KEY`, `POSTHOG_BASE_URL`이 추가로 필요합니다.
- `POSTHOG_BASE_URL`이 없으면 `NEXT_PUBLIC_POSTHOG_UI_HOST` 또는 `NEXT_PUBLIC_POSTHOG_HOST`에서 유도합니다.

### Sentry

- `next.config.ts`, `instrumentation.ts`, `app/error.tsx`, `app/global-error.tsx`가 Sentry 설정을 사용합니다.
- 개발도구 > 모니터링에서 클라이언트/서버 테스트 이벤트를 보낼 수 있습니다.

### LLM Gateway / Cloudflare Access

- `LLM_BASE_URL`은 브라우저가 아니라 서버 라우트(`app/api/admin/ai-write/route.ts`)에서만 사용합니다.
- 외부 공개 경로는 `Cloudflare Tunnel + Access Service Token` 조합을 권장합니다.
- 자세한 운영 절차는 `docs/llm-gateway-cloudflare-setup.md`를 참고하세요.

### AI 운영실 원격 프록시

- `AI_OPS_AGENT_BASE_URL`이 비어 있지 않으면 `/api/admin/ai-ops/*`는 원격 엔진으로 프록시됩니다.
- `AI_OPS_AGENT_BASE_URL`이 비어 있으면 관리자페이지 AI 운영실은 **원격 엔진 없이 Next.js 내장 로컬 구현으로 계속 동작**합니다.
- 제안 생성은 LLM 호출이 포함돼 오래 걸릴 수 있으므로 `AI_OPS_AGENT_SUGGESTION_TIMEOUT_MS` 기본값을 `55000`ms로 둡니다.
- 타임아웃이 반복되면 원격 엔진의 실제 처리 시간과 Vercel 함수 `maxDuration`을 함께 확인하세요.

### ai-ops-agent 서비스 전용 환경변수

- `.env.example`의 `AI_OPS_DATABASE_URL`, `AI_OPS_LLM_BASE_URL`, `AI_OPS_LLM_MODEL`, `AI_OPS_SHARED_SECRET`는 **선택적인 `services/ai-ops-agent` 프로세스용 예시값**입니다.
- 이 값들은 현재 Next.js 관리자페이지가 직접 읽지 않습니다. 관리자페이지는 `AI_OPS_AGENT_BASE_URL`로 원격 프록시를 켜거나, 비워 두고 로컬 구현을 사용합니다.
