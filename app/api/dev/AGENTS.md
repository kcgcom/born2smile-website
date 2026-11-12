# 개발도구 API

- `env-status/route.ts`, `env-value/route.ts`, `pagespeed/route.ts` 모두 관리자 인증을 요구한다.
- 환경변수 정의와 허용 목록은 `lib/dev-data.ts`의 ENV_VARIABLES를 확인한다.
- env-status는 설정 여부, env-value는 허용된 키의 실제 값을 반환하는 별개 경로다. env-value 응답·테스트·로그에 비밀값이 남지 않도록 하며 허용 범위를 임의 확대하지 않는다.
- PageSpeed는 코드에 정의된 홈페이지 대상 URL과 mobile/desktop 전략을 사용한다. 임의 URL 프록시로 바꾸지 않는다.
- PageSpeed는 strategy=mobile 또는 strategy=desktop을 필수로 받는다. 누락·잘못된 값은 400이다. force=true는 선택한 환경만 재측정한다.
- PageSpeed는 Supabase의 환경별 일별 캐시만 사용한다. 이전 날짜 결과는 stale 표시와 함께 반환하고 응답 후 갱신한다. 통합 캐시·통합 측정·unstable_cache 경로는 없다.
- 인증 실패·미설정·외부 서비스 실패를 화면에서 구분할 수 있게 응답 계약을 유지한다.
