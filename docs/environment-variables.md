# Environment Variables

로컬 개발: `.env.example` → `.env.local`로 복사하여 사용.
프로덕션: Vercel Dashboard → Settings → Environment Variables로 관리.

## 변수 목록

| 변수 | 설명 | 필수 여부 |
|------|------|----------|
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | Kakao Maps JavaScript App Key | 지도 컴포넌트 필수 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS 적용) | 필수 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (RLS 바이패스, 서버 전용) | 필수 |
| `ADMIN_EMAILS` | 관리자 이메일 화이트리스트 (쉼표 구분, default: `kcgcom@gmail.com`) | 필수 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google 서비스 계정 JSON key (GA4/Search Console API 인증) | GA4/SC 탭 필수 |
| `GA4_PROPERTY_ID` | Google Analytics 4 속성 ID (숫자만, 예: `525397980`) | 트래픽 탭 필수 |
| `SEARCH_CONSOLE_SITE_URL` | Search Console 사이트 URL (예: `sc-domain:born2smile.co.kr`, `https://www.born2smile.co.kr/`) | 검색/SEO 탭 필수 |
| `NAVER_DATALAB_CLIENT_ID` | 네이버 DataLab API Client ID (미설정 시 섹션 숨김) | 선택 |
| `NAVER_DATALAB_CLIENT_SECRET` | 네이버 DataLab API Client Secret | DATALAB 사용 시 필수 |
| `NAVER_SEARCHAD_API_KEY` | 네이버 검색광고 API Key (절대 검색량 조회, 미설정 시 DataLab 상대값으로 폴백) | 선택 |
| `NAVER_SEARCHAD_SECRET_KEY` | 네이버 검색광고 API Secret Key (HMAC-SHA256 서명) | SEARCHAD 사용 시 필수 |
| `NAVER_SEARCHAD_CUSTOMER_ID` | 네이버 검색광고 고객 ID | SEARCHAD 사용 시 필수 |
| `PAGESPEED_API_KEY` | Google PageSpeed Insights API 키 (Cloud Console에서 API 키 생성 + PSI API 활성화) | 성능 탭 필수 |
| `CRON_SECRET` | Vercel Cron Job 인증 토큰 (임의 문자열) | 예약 발행 필수 |
| `LLM_BASE_URL` | AI 작성 도우미가 호출할 LLM gateway URL (`https://llm.born2smile.co.kr` 권장) | AI 작성 도우미 필수 |
| `LLM_MODEL` | gateway에 전달할 기본 모델 이름 (예: `fast`) | AI 작성 도우미 필수 |
| `CLOUDFLARE_ACCESS_CLIENT_ID` | Cloudflare Access Service Token Client ID (Vercel 서버 -> gateway 인증) | Access 보호 사용 시 필수 |
| `CLOUDFLARE_ACCESS_CLIENT_SECRET` | Cloudflare Access Service Token Client Secret | Access 보호 사용 시 필수 |
| `LLM_UPSTREAM_TIMEOUT_MS` | Vercel 서버가 gateway 응답을 기다리는 최대 시간(ms) | 선택 |

## 네이버 검색광고 API 주의사항

- **키워드 공백 불가**: `hintKeywords` 파라미터는 공백 없는 키워드만 허용 (예: `임플란트비용`, NOT `임플란트 비용`). `admin-naver-searchad.ts`의 `normalizeKeyword()`가 자동 처리.
- **시간당 호출 제한**: API 레이트 리밋 있음. 순차 배치 호출(200ms 간격) + 24시간 `unstable_cache`로 보호.
- **환경변수 lazy 읽기**: 런타임 초기화 타이밍 보장을 위해 모듈 레벨 상수 대신 `getApiKey()` 등 lazy getter 사용. 시크릿에 trailing newline이 있을 수 있어 `.trim()` 필수.
- **HMAC 서명**: `{timestamp}.GET./keywordstool` 형식, SHA-256, Base64 인코딩.

## AI 블로그 작성 도우미 / Cloudflare Access 메모

- `LLM_BASE_URL`은 브라우저가 아니라 **서버 라우트**(`app/api/admin/ai-write/route.ts`)에서만 사용합니다.
- Vercel을 유지하면서 로컬 LLM gateway를 외부에 안전하게 노출하려면 `Cloudflare Tunnel + Access Service Token` 조합을 권장합니다.
- 이때 Vercel 환경변수에 `CLOUDFLARE_ACCESS_CLIENT_ID`, `CLOUDFLARE_ACCESS_CLIENT_SECRET`를 넣고, 서버 라우트가 `CF-Access-Client-Id`, `CF-Access-Client-Secret` 헤더로 gateway를 호출합니다.
- 로컬/LAN에서는 `192.168.1.201:<gateway-port>`로 직접 접근하고, 외부 경로는 Access 정책이 붙은 tunnel hostname으로만 사용하세요.
- `LLM_UPSTREAM_TIMEOUT_MS`는 Vercel 함수 시간 제한보다 짧게 유지해야 합니다. 현재 예시는 `55000ms`입니다.
