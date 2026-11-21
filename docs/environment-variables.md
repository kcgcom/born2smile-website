# Environment Variables

로컬 개발은 `.env.example`를 `.env.local`로 복사해서 사용합니다.
프로덕션/프리뷰는 Vercel Dashboard → Settings → Environment Variables에서 관리합니다.

## 빠른 기준

- **필수 코어**: Supabase, 관리자 이메일
- **기능별 선택**: GA4 / Search Console / Gemini / Naver / PageSpeed / PostHog / Sentry
- **운영 자동화**: `CRON_SECRET`, `INDEXNOW_KEY`

## 변수 목록

| 변수 | 용도 | 필요 시점 |
|------|------|-----------|
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | Kakao Maps SDK | 연락처/지도 노출 시 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 필수 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Admin key | 필수 |
| `ADMIN_EMAILS` | 관리자 이메일 화이트리스트 | 브라우저 관리자 로그인·권한 확인 시 필수 |
| `ADMIN_CLI_SECRET` | 관리자 API의 CLI 인증용 서버 비밀키 | CLI 재검증 등 관리자 작업 시 사용. 호출 대상 서버와 동일한 값 |
| `AGENT_CONTENT_SECRET` | 허용된 조회·작업 제안/보고·비공개 원고/수정안 생성·이미지 업로드용 키 | `agent:task`, `content-tasks` API, `agent:revision`, `POST /api/admin/upload`에 사용. 작업 승인·완료·기존 원본 직접 수정·발행·삭제·적용 권한 없음 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | GA4/Search Console 서버 인증 JSON | WIF 미설정 환경에서 기존 인증 사용 시 |
| `GCP_PROJECT_ID` | Google Cloud 프로젝트 ID | WIF 사용 시 |
| `GCP_PROJECT_NUMBER` | Workload Identity Pool이 속한 Google Cloud 프로젝트 번호 | WIF 사용 시 |
| `GCP_WORKLOAD_IDENTITY_POOL_ID` | Workload Identity Pool ID | WIF 사용 시 |
| `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | Vercel OIDC 공급자 ID | WIF 사용 시 |
| `GCP_SERVICE_ACCOUNT_EMAIL` | GA4 및 Search Console 조회 권한을 가진 서비스 계정 이메일 | WIF 사용 시 |
| `GA4_PROPERTY_ID` | GA4 속성 ID | `/admin/analysis/traffic` 사용 시 |
| `SEARCH_CONSOLE_SITE_URL` | Search Console 속성 URL | `/admin/analysis/search` 사용 시 |
| `NAVER_DATALAB_CLIENT_ID` | DataLab Client ID | 트렌드 사용 시 |
| `NAVER_DATALAB_CLIENT_SECRET` | DataLab Client Secret | 트렌드 사용 시 |
| `NAVER_SEARCHAD_API_KEY` | 검색광고 API Key | 절대 검색량 사용 시 |
| `NAVER_SEARCHAD_SECRET_KEY` | 검색광고 Secret Key | 절대 검색량 사용 시 |
| `NAVER_SEARCHAD_CUSTOMER_ID` | 검색광고 고객 ID | 절대 검색량 사용 시 |
| `PAGESPEED_API_KEY` | PageSpeed Insights API 키 | PageSpeed 조회 시 선택. 설정된 경우 요청에 포함 |
| `GEMINI_API_KEY` | Gemini Embedding API 키 | 검색 성과의 의미 기반 키워드 클러스터링 사용 시 |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry 클라이언트 DSN | 에러 모니터링 사용 시 |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | 공개 환경명 | Sentry 사용 시 |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | 클라이언트 trace 샘플링 | Sentry 사용 시 |
| `SENTRY_ENVIRONMENT` | 서버 환경명 | Sentry 사용 시 |
| `SENTRY_ORG` | Sentry org slug | 빌드 소스맵 업로드 연동 시 |
| `SENTRY_PROJECT` | Sentry project slug | 빌드 소스맵 업로드 연동 시 |
| `SENTRY_AUTH_TOKEN` | Sentry auth token | 빌드 소스맵 업로드 연동 시 |
| `NEXT_PUBLIC_POSTHOG_TOKEN` | PostHog 웹 SDK 토큰 | 전환 측정 사용 시 |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest host | 전환 측정 사용 시 |
| `NEXT_PUBLIC_POSTHOG_UI_HOST` | PostHog UI host | 전환 리포트 링크 생성 시 |
| `POSTHOG_PROJECT_ID` | PostHog 프로젝트 ID | 전환 리포트 API 사용 시 |
| `POSTHOG_API_KEY` | PostHog query API key | 전환 리포트 API 사용 시 |
| `POSTHOG_BASE_URL` | PostHog API base URL | 전환 리포트 API 사용 시 |
| `CRON_SECRET` | rebuild/searchad-sync/indexing-monitor cron 인증 토큰 | 운영 자동화 시 필수 |
| `INDEXNOW_KEY` | IndexNow 제출 키 | 자동/수동 IndexNow 제출 시 권장 |

에이전트 키 두 개와 `ADMIN_CLI_SECRET`은 서로 다른 값이어야 한다. 에이전트 키는 허용 경로만 통과하며 `/api/admin/content-revisions/{id}/apply`는 관리자 Supabase 로그인 토큰이 필요하다. 기존 `ADMIN_CLI_SECRET` 자체의 광범위한 권한은 변경하지 않았으므로 에이전트에 해당 키를 제공하면 이 제한을 우회할 수 있다.

## 운영 자동화 메모

### Vercel Cron

- `vercel.json`: KST 00:05 `/api/cron/rebuild`, 00:20 `/api/cron/indexing-monitor`, 00:35 `/api/cron/searchad-sync`. 일정은 UTC로 저장합니다.
- 요청 헤더의 `Authorization: Bearer <CRON_SECRET>`가 일치해야 동작합니다.

### IndexNow

- 서버 라우트(`lib/indexnow.ts`)는 `INDEXNOW_KEY`가 있을 때만 제출합니다.
- 공개 키 파일은 `public/<INDEXNOW_KEY>.txt` 형식으로 함께 존재해야 합니다.
- 수동 제출 스크립트는 `pnpm submit-indexnow`, `pnpm submit-indexnow:all`입니다.
- 기간을 지정하면 한국시간 기준 시작일과 종료일을 포함해 해당 기간에 발행된 글만 선택합니다. `node scripts/submit-indexnow.mjs --from 2026-01-01 --to 2026-01-31 --dry-run`으로 대상 URL을 먼저 확인할 수 있습니다. 실제 제출에는 `--dry-run`을 제거합니다.
- 관리자 색인 화면의 자동 제출 상태를 사용하려면 `027_indexnow_runs.sql` 마이그레이션을 적용합니다. 사이트 전체의 최근 실행과 최근 HTTP 200 접수를 보관합니다. 게시물별로는 마지막 HTTP 200 접수를 보관하고, 제출 시작 시각과 게시물 수정 시각을 비교해 제출 필요 여부를 표시합니다. 수동 CLI 결과는 터미널에 표시됩니다.

## 기능별 메모

### GA4 및 Search Console의 Vercel 인증

1. Vercel 프로젝트의 OIDC를 활성화하고, Google Cloud에서 Vercel 발급자를 신뢰하는 Workload Identity Pool과 OIDC 공급자를 구성한다. 공급자의 허용 대상(audience)은 Vercel 팀에 맞추고, 서비스 계정의 `roles/iam.workloadIdentityUser`는 연결할 Vercel 프로젝트와 환경의 정확한 subject에만 부여한다. [Vercel 설정 가이드](https://vercel.com/docs/oidc/gcp)
2. Vercel의 해당 환경에 위 표의 `GCP_*` 다섯 값을 설정한다. 앱은 값이 모두 설정되면 WIF를 사용하며, 일부만 설정된 경우 설정 오류를 반환한다. 다섯 값이 모두 비어 있으면 기존 JSON 키 또는 Application Default Credentials를 사용한다.
3. 배포 후 새로 조회한 GA4 보고서, Search Console 검색 성과와 사이트맵, 색인 모니터의 URL 검사 결과를 확인한다. 기존 키를 다른 작업에서 사용 중인지 확인한 뒤 Vercel에서 `GOOGLE_SERVICE_ACCOUNT_KEY`를 제거하고 Google Cloud에서 해당 키를 폐기한다.

### Google Business Profile 성과

- 운영 개요의 구글 지도·병원 프로필 카드는 선택 기능이다. Google Cloud 프로젝트에서 [Business Profile API 접근 권한](https://developers.google.com/my-business/content/prereqs)을 확인하고 Business Profile Performance API를 활성화한다.
- 병원 프로필을 관리할 권한이 있는 Google 계정으로 [OAuth 동의](https://developers.google.com/my-business/content/implement-oauth)를 받고, `https://www.googleapis.com/auth/business.manage` 범위의 오프라인 갱신 토큰을 발급한다.
- 서버 환경에 `GOOGLE_BUSINESS_PROFILE_CLIENT_ID`, `GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET`, `GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN`을 설정한다. `GOOGLE_BUSINESS_PROFILE_LOCATION_ID`에는 API의 `locations/{locationId}`에서 숫자 부분을 입력한다.
- 연결 후 운영 개요에서 구글 프로필 성과를 확인한다. 집계 지연을 고려해 한국시간 기준 3일 전까지 최근 28일과 직전 28일을 비교한다. 노출은 기기별 수치의 합계다.

### 네이버 검색광고 API

- `hintKeywords`는 공백 없는 형태로 요청합니다. (`normalizeKeyword()`가 자동 처리)
- 수집 작업이 SearchAd/DataLab 스냅샷을 게시하고 활성 포인터를 갱신합니다. `lib/admin-searchad-snapshots.ts`와 `vercel.json`을 기준으로 확인합니다.
- 시크릿 문자열에 trailing newline이 섞일 수 있어 `.trim()` 처리합니다.

### PostHog

- 브라우저 추적에는 `NEXT_PUBLIC_POSTHOG_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`가 필요합니다.
- 관리자 전환 리포트 API에는 `POSTHOG_PROJECT_ID`, `POSTHOG_API_KEY`, `POSTHOG_BASE_URL`이 추가로 필요합니다.
- `POSTHOG_BASE_URL`이 없으면 `NEXT_PUBLIC_POSTHOG_UI_HOST` 또는 `NEXT_PUBLIC_POSTHOG_HOST`에서 유도합니다.
- 본문 읽기와 카드 노출·클릭 이벤트는 공통 PostHog 연결 설정과 수집 제외 조건을 따릅니다.

### Sentry

- `next.config.ts`, `instrumentation.ts`, `app/error.tsx`, `app/global-error.tsx`가 Sentry 설정을 사용합니다.
- `/admin/system/monitoring`은 현재 `PerformanceTab`의 PageSpeed 화면입니다. Sentry 테스트 이벤트 UI가 있다고 가정하지 않습니다.
- 브라우저 초기화는 `instrumentation-client.ts`, 공통 옵션은 `sentry-options.ts`, 서버·Edge 초기화는 해당 sentry 설정 파일을 확인합니다.

## 빌드·도구 전용 설정

아래 값은 일반 운영 비밀키 목록과 구분합니다. 전체 요구사항은 호출 코드와 package.json이 기준이며 `.env.example`는 시작용 예시입니다.

| 변수 | 동작 |
|---|---|
| `BLOG_PUBLIC_DATA_SOURCE` | `snapshot`이면 공개 조회에 생성 스냅샷 사용. dev/build가 설정 |
| `BLOG_SNAPSHOT_REQUIRED` | `true`이면 스냅샷 조회 실패 시 중단. build가 설정 |
| `REVALIDATE_BASE_URL` | 재검증 스크립트의 대상 사이트 URL |
| `ANALYZE` | next.config.ts의 번들 분석 옵션 |
| `VERCEL_GIT_COMMIT_SHA` | 배포별 공개 블로그 캐시 키 분리 |
| `VERCEL_ENV`, `NODE_ENV`, `CI` | 실행 환경·모니터링·빌드 설정 분기 |

NEXT_PUBLIC 접두사 값은 브라우저 노출을 전제로 합니다. service-role 키, CLI 인증키, 외부 API 비밀키를 이 접두사로 옮기지 않습니다. env-value 관리자 API는 허용 목록의 실제 값을 반환하므로 조사 결과·로그·문서에 응답 값을 복사하지 않습니다.
