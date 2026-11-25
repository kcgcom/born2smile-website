# 개발도구 API

- `env-status/route.ts`, `env-value/route.ts`, `pagespeed/route.ts` 모두 관리자 인증을 요구한다.
- 환경변수 정의와 허용 목록은 `lib/dev-data.ts`의 ENV_VARIABLES를 확인한다.
- env-status는 설정 여부, env-value는 허용된 키의 실제 값을 반환하는 별개 경로다. env-value 응답·테스트·로그에 비밀값이 남지 않도록 하며 허용 범위를 임의 확대하지 않는다.
- PageSpeed 대상은 `lib/pagespeed-targets.ts`에 정의한다. 임의 URL 프록시로 바꾸지 않는다.
- Google에 전달하는 검사 URL에만 성능 검사 표시를 붙인다. 공개 페이지는 이 표시가 있으면 GA4와 PostHog 이벤트를 수집하지 않는다.
- PageSpeed는 `strategy=mobile` 또는 `strategy=desktop`이 필수이며 `target` 생략 시 홈페이지를 사용한다. 잘못된 전략이나 대상은 400이다. `force=true`는 선택한 페이지·기기만 재측정한다.
- PageSpeed는 Supabase에 페이지·기기별 최신 성공 결과를 저장한다. 홈페이지의 이전 날짜 결과는 stale로 반환하고 응답 후 갱신한다. 추가 페이지는 일반 조회에서 저장된 결과만 반환하고 수동 측정 요청에서 Google을 호출한다.
- PageSpeed는 Supabase에서 페이지·기기별 실행 권한을 공유한다. 진행 중인 측정이 있으면 수동 요청은 결과를 기다리며, 수동 요청은 실패 후 자동 재시도 대기 시간에도 새 측정을 시작할 수 있다. 대상 확장 마이그레이션은 이 경로를 사용하는 앱 배포 전에 적용한다.
- 인증 실패·미설정·외부 서비스 실패를 화면에서 구분할 수 있게 응답 계약을 유지한다.
