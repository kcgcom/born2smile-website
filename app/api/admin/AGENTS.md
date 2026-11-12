# 관리자 API

- `verifyAdminRequest`와 `unauthorizedResponse`는 `_lib/auth.ts`에 있다. Supabase access token과 ADMIN_EMAILS를 검증하며, 설정된 ADMIN_CLI_SECRET을 사용하는 별도 인증 경로도 있다. 키를 클라이언트에 전달하거나 로그에 노출하지 않는다.
- 인증 뒤 입력을 검증하고 DB·외부 API에 접근한다. 블로그·설정 스키마는 `lib/blog-validation.ts`, 다른 도메인은 해당 라우트의 스키마를 확인한다.
- `_lib/cache.ts`의 서버 캐시·TTL과 `_lib/blog-cache.ts`의 블로그 재검증을 재사용한다. TTL 숫자나 재검증 경로를 문서에서 복제하지 않는다.
- 블로그 본문은 blocks, DB 저장은 content 매핑을 사용한다. `lib/blog-supabase.ts`의 정규화·본문·날짜 처리를 보존한다.
- `blog-posts/`, `research/`, `site-config/`, `content-planner/`, `content-coverage/`, `keyword-taxonomy/` 등 각 도메인의 조회와 변경 권한을 구분한다.
- 분석·외부 API가 설정되지 않은 경우의 응답은 각 서비스 계약을 따른다. 모든 오류를 빈 데이터나 성공으로 바꾸지 않는다.
- Next.js 동적 params는 현재 라우트의 Promise 타입과 await 패턴을 따른다.
- 관리자 응답은 private/no-store 정책을 유지하고, 변경 후 관련 클라이언트 캐시와 공개 경로가 필요한 범위에서 갱신되는지 확인한다.
