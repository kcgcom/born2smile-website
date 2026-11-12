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
| `ADMIN_CLI_SECRET` | 관리자 API의 CLI 인증용 서버 비밀키 | CLI 재검증 등 별도 운영 호출 시 선택 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | GA4/Search Console 서버 인증 JSON | GA4/SC 사용 시 |
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

## 운영 자동화 메모

### Vercel Cron

- `vercel.json`: KST 00:05 `/api/cron/rebuild`, 00:20 `/api/cron/indexing-monitor`, 00:35 `/api/cron/searchad-sync`. 일정은 UTC로 저장합니다.
- 요청 헤더의 `Authorization: Bearer <CRON_SECRET>`가 일치해야 동작합니다.

### IndexNow

- 서버 라우트(`lib/indexnow.ts`)는 `INDEXNOW_KEY`가 있을 때만 제출합니다.
- 공개 키 파일은 `public/<INDEXNOW_KEY>.txt` 형식으로 함께 존재해야 합니다.
- 수동 제출 스크립트는 `pnpm submit-indexnow`, `pnpm submit-indexnow:all`입니다.

## 기능별 메모

### 네이버 검색광고 API

- `hintKeywords`는 공백 없는 형태로 요청합니다. (`normalizeKeyword()`가 자동 처리)
- 수집 작업이 SearchAd/DataLab 스냅샷을 게시하고 활성 포인터를 갱신합니다. `lib/admin-searchad-snapshots.ts`와 `vercel.json`을 기준으로 확인합니다.
- 시크릿 문자열에 trailing newline이 섞일 수 있어 `.trim()` 처리합니다.

### PostHog

- 브라우저 추적에는 `NEXT_PUBLIC_POSTHOG_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`가 필요합니다.
- 관리자 전환 리포트 API에는 `POSTHOG_PROJECT_ID`, `POSTHOG_API_KEY`, `POSTHOG_BASE_URL`이 추가로 필요합니다.
- `POSTHOG_BASE_URL`이 없으면 `NEXT_PUBLIC_POSTHOG_UI_HOST` 또는 `NEXT_PUBLIC_POSTHOG_HOST`에서 유도합니다.

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
