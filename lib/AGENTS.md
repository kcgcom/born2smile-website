# lib/

- `constants.ts`는 병원정보·진료목록의 코드 기본값이다. `site-config-supabase.ts`의 운영 설정 덮어쓰기와 호출 경로를 확인한다.
- `supabase.ts`는 브라우저 클라이언트, `supabase-admin.ts`는 서버의 service-role 접근이다. 관리자 모듈을 클라이언트 번들로 가져오지 않는다.
- `admin-auth.ts`, `server-admin-check.ts`, `app/api/admin/_lib/auth.ts`는 서로 다른 호출 경계의 인증을 담당한다. 변경 시 로그인·API·서버 페이지를 함께 확인한다.
- 블로그 저장·조회는 `blog-supabase.ts`, 입력은 `blog-validation.ts`, 타입·스냅샷 규칙은 `blog/AGENTS.md`를 따른다.
- `admin-*.ts`는 분석·검색·택소노미 등 외부 API와 운영 데이터를 처리한다. 미설정·실패·캐시된 결과를 구분하고 외부 호출을 무조건 재시도하지 않는다.
- `content-coverage/`, `keyword-candidate-*.ts`, `opportunity-scoring.ts`를 수정할 때 평가용 scripts와 관련 docs를 확인한다. generated라는 이름만 보고 평가 기준 데이터를 삭제하지 않는다.
- `jsonld.ts`, `seo.ts`, `opening-hours-jsonld.ts`, `llms-text.ts`는 공개 정보의 일관성을 유지해야 한다. 날짜는 `date.ts`와 `blog/dates.ts`를 확인한다.
- `research/`는 연구 자료 타입·스냅샷·조회, `dev-data.ts`와 `dev/generated/`는 관리자 개발도구 데이터를 제공한다.
- 캐시 무효화·재검증은 기존 헬퍼를 사용한다. 구체적인 TTL·키·태그는 구현을 기준으로 하며 문서에 중복 상수로 고정하지 않는다.
