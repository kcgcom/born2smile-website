# born2smile-website

서울본치과 웹사이트. 한국어 전용, 김포 지역 검색을 위한 Next.js App Router 앱이며 Vercel에 배포한다.

## 지침과 작업 범위

- 이 파일은 프로젝트 공통 규칙이다. 수정할 디렉터리의 하위 `AGENTS.md`도 읽는다.
- 시작 안내와 구조는 `README.md`, 세부 운영 흐름은 관련 `docs/` 문서를 필요할 때 참고한다. `CLAUDE.md`는 이 지침을 안내하는 진입점이다. 문서의 버전·파일 목록이 코드와 다르면 `package.json`, 설정, 실제 구현으로 확인한다.
- 작업 시작 시 `git status --short`로 기존 변경을 확인하고 보존한다. 요청과 무관한 수정·커밋·되돌리기를 하지 않는다.
- 구현 요청은 수정과 검증까지 완료한다. 리뷰·조사 요청에서는 결과를 보고하며, 코드 수정이나 발행 권한까지 추정하지 않는다.
- 스킬은 작업에 필요한 것만 선택한다. 스킬에 포함된 배포·DB 변경·외부 전송 절차도 사용자가 승인한 범위 안에서만 실행한다.

- 프로젝트 공통 규칙은 이 파일, 디렉터리별 추가 규칙은 하위 `AGENTS.md`에서 관리한다. 개인 환경·임시 실행 기록은 프로젝트 지침에 포함하지 않는다.
- 프로젝트의 `AGENTS.md`는 Git으로 관리한다. 도구 상태·캐시 디렉터리의 동명 파일은 추적하지 않는다.

## 구현 기준

- `pnpm` 사용. 정확한 의존성 버전과 명령은 `package.json` 및 `pnpm-lock.yaml`을 기준으로 한다.
- TypeScript strict mode, 2-space 들여쓰기, `@/*` 임포트. 컴포넌트는 PascalCase, 함수·변수는 camelCase, 상수는 UPPER_SNAKE_CASE.
- 서버 컴포넌트가 기본이다. 브라우저 API·상태·이벤트가 필요한 경계에만 `"use client"`를 둔다.
- Tailwind CSS 4 토큰은 `app/globals.css`의 `@theme inline`에 있다. 별도 `tailwind.config`를 만들지 않는다. 기존 UI와 폰트·간격·모션 패턴을 따른다.
- 병원 정보의 코드 기본값은 `lib/constants.ts`에서 먼저 수정한다. 운영 설정은 `lib/site-config-supabase.ts`를 통해 기본값을 덮어쓸 수 있으므로 실제 소비 경로도 확인한다.
- 블로그 URL 매핑은 `lib/blog/category-slugs.ts`, 콘텐츠 타입은 `lib/blog/types.ts`, 구조화 데이터는 `lib/jsonld.ts`에서 관리한다.
- 공개 블로그의 dev/build snapshot 전략과 런타임 Supabase → snapshot 폴백을 보존한다. `lib/blog/generated/`, `lib/dev/generated/` 파일은 생성 스크립트로 갱신한다.
- Supabase Admin/service-role 키는 서버 전용이다. 관리자 API는 서버에서 인증과 입력 검증을 수행한다. 브라우저 Auth, 공개 질문 해결 피드백 저장 API, 관리자 데이터 접근을 구분한다.
- 예약 발행 날짜는 KST 기준이다. 메타데이터·canonical·사이트맵·JSON-LD·리다이렉트 변경 시 서로 일치하는지 확인한다.
- 한국어 UI, 시맨틱 HTML, 키보드 조작, 포커스 표시, `prefers-reduced-motion`을 유지한다.

## 검증

- 앱 코드 변경 후 `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`를 실행한다. 각 명령의 성공 여부를 구분해 보고한다.
- Playwright 테스트가 `tests/`에 있다. UI·라우팅 변경은 관련 spec을 `pnpm exec playwright test tests/<파일>.spec.ts`로 실행하고, 전체 회귀 확인은 `pnpm test:e2e`를 사용한다.
- Playwright는 `playwright.config.ts`에 따라 `pnpm dev`를 시작하거나 3000번 포트의 서버를 재사용한다. 기존 서버가 이 작업의 코드인지 확인한다.
- `pnpm dev/build`는 snapshot과 매니페스트를 생성한다. build는 `BLOG_SNAPSHOT_REQUIRED=true`로 실행되므로 환경변수·데이터 접근 문제로 실패할 수 있다. 검사를 우회하거나 운영 데이터를 바꾸지 말고 실패 원인과 미검증 범위를 보고한다.
- 문서·지침·스킬만 바꾼 경우 경로, 링크, 명령, 스킬 메타데이터와 변경 diff를 검증한다. 앱 빌드가 필요한 변경인지 구분한다.
- 실패가 기존 변경이나 환경 문제에서 비롯되면 요청한 수정과 구분해 보고한다. 통과하지 않은 검사를 통과했다고 적지 않는다.

## 배포와 데이터

- 운영 배포는 승인된 `main` 반영(push 또는 merge)에 따른 GitHub → Vercel 자동 배포만 사용한다. `main` 반영 요청은 운영 배포를 시작할 수 있는 작업으로 취급한다.
- `pnpm deploy`는 실제 배포 없이 안내를 출력하고 종료 코드 1로 끝나는 차단 명령이다. 이 명령이나 `node scripts/forbid-production-deploy.mjs`로 차단 동작을 검증하는 것은 허용한다.
- 이 스크립트가 기술적으로 차단하는 범위는 `pnpm deploy`뿐이다. 직접 `vercel --prod` 실행이나 대시보드 수동 운영 배포로 Git 경로를 우회하지 않는다. Vercel 계정 권한까지 제한하는 장치는 아니다.
- 로컬 검증·커밋 요청은 push·PR·merge·운영 배포 승인을 뜻하지 않는다. 사용자가 해당 작업을 명시적으로 요청했다면 기존 승인 범위에서 진행하며 같은 승인을 반복 확인하지 않는다.
- 승인된 브랜치 push·PR 생성에는 Git 연동에 따른 Preview 배포가 포함될 수 있다. Preview 생성 조건은 Vercel 프로젝트 설정을 확인하며, Preview 승인을 `main` 반영이나 운영 배포 승인으로 확대하지 않는다.
- DB 마이그레이션 작성과 운영 DB 적용은 별개다. 운영 적용은 요청 범위에 포함된 경우에만 수행한다.
- `.env.local`, 토큰, service-role 키, 환자·관리자 개인정보를 출력하거나 커밋하지 않는다. 환경변수 문서는 `.env.example`와 `docs/environment-variables.md`를 참고한다.
- 커밋을 요청받으면 한국어 conventional commit 메시지를 사용한다 (`feat:`, `fix:`, `docs:` 등).

## 필요한 문서 찾기

| 작업 | 먼저 볼 위치 |
|------|-------------|
| 페이지·API·관리자 화면 | `app/AGENTS.md`와 해당 하위 지침 |
| 공통 UI·레이아웃 | `components/AGENTS.md`, `hooks/AGENTS.md` |
| 데이터·인증·SEO | `lib/AGENTS.md`, `lib/blog/AGENTS.md` |
| 생성·검증 스크립트 | `scripts/AGENTS.md`, `package.json` |
| 블로그 작성·발행 | `docs/blog-writing-guide.md`, `docs/blog-workflow.md` |
| DB·운영 설정 | `docs/supabase-architecture.md`, `supabase/migrations/` |
| 문서 유지보수 | `docs/AGENTS.md` |
