# app/api/

- `admin/`와 `dev/`는 관리자 인증 API, `cron/`은 CRON_SECRET 인증 작업이다. 인증 방식과 응답 형식을 무조건 통일하지 않는다.
- 관리자 요청은 `admin/_lib/auth.ts`의 검증 경로를 사용한다. 실패 시 데이터 접근 전에 반환한다.
- cron 일정은 `vercel.json`, 실제 동작은 `cron/rebuild/route.ts`, `cron/searchad-sync/route.ts`, `cron/indexing-monitor/route.ts`를 기준으로 한다.
- 비밀정보·인증 데이터가 공개 캐시에 들어가지 않도록 한다. 외부 API 결과의 서버 캐시와 HTTP 응답 캐시는 구분한다.
- 입력·동적 params·외부 서비스 오류는 라우트별 계약에 맞춰 처리한다. 수정과 함께 호출하는 화면·스크립트도 확인한다.
