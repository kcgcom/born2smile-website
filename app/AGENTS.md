# app/

공통 작업·검증·배포 규칙은 루트 `AGENTS.md`를 따른다.

- App Router의 페이지·레이아웃·API·메타데이터 진입점이다. 서버 컴포넌트가 기본이며 상호작용은 필요한 클라이언트 컴포넌트에 둔다.
- `layout.tsx`는 공통 폰트, Header/Footer, FloatingCTA, 관리자 상태 Provider, 분석 스크립트와 구조화 데이터를 연결한다. 수정 시 공개 페이지와 관리자 영역을 함께 확인한다.
- `globals.css`의 토큰·공통 유틸리티를 재사용한다. 디자인 방향은 `DESIGN.md`를 참고한다.
- 공개 페이지는 `about/`, `contact/`, `faq/`, `treatments/`, `blog/`, `research/`, `privacy/`에 있다. 세부 작업은 해당 하위 지침을 읽는다.
- `robots.ts`는 force-static, `sitemap.ts`는 revalidate 설정을 사용한다. 모든 메타데이터 경로에 같은 렌더링 설정을 강제하지 않는다.
- RSS는 `feed.xml/route.ts`, AI 안내문은 `llms.txt/route.ts`에서 생성한다. 정적 public 파일로 중복 작성하지 않는다.
- URL 변경 시 `next.config.ts`, `proxy.ts`, canonical, sitemap, JSON-LD 및 관련 라우팅 테스트를 함께 확인한다.
- `error.tsx`, `global-error.tsx`, `not-found.tsx`의 한국어 안내와 복구 동선을 유지한다.
