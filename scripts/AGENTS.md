# scripts/

- 실행 명령과 생성 순서는 `package.json`이 기준이다. dev/build는 사이트 설정 스냅샷을 먼저 준비하고 블로그 스냅샷·메타데이터·개발 매니페스트·연구·택소노미 스냅샷을 생성한다. build는 사이트 설정 강제 갱신과 최신 블로그 스냅샷을 요구한다. dev:live는 사이트 설정을 런타임에 조회한다.
- 블로그 생성 규칙은 `lib/blog/AGENTS.md`를 따른다. 생성 파일은 직접 편집하지 않는다.
- `generate-dev-manifest.ts`는 의존성·라우트·프로젝트 통계를 생성한다. 환경변수 실제 값을 산출물에 넣지 않는다.
- verify/evaluate/report 계열도 파일 쓰기·외부 API 호출을 포함할 수 있다. 이름만 보고 읽기 전용이라고 판단하지 말고 실행 모드·출력 경로·비용을 확인한다.
- `.tmp/`의 임베딩 캐시는 재생성에 외부 호출이 필요할 수 있다. 정리 전 소비 스크립트를 확인한다.
- `annotate-swallowed-prosthesis.ts`, `repair-research-callout-labels.ts`, `migrate-blog-images-to-category-folders.ts` 등 운영 데이터 유틸리티는 미리보기와 적용을 구분한다. DB·스토리지 변경은 승인 범위에서만 실행한다.
- `submit-indexnow.mjs`와 `revalidate-blog-post.mjs`는 외부 서비스·공개 사이트에 영향을 준다. 단순 로컬 검증 단계로 자동 실행하지 않는다.
- package.json의 deploy 명령은 `forbid-production-deploy.mjs`에 연결되어 종료 코드 1로 끝난다. 차단 확인을 위한 실행은 가능하며 실제 배포는 하지 않는다. 차단 범위와 push·merge·Preview 승인 기준은 루트 `AGENTS.md`를 따른다.
