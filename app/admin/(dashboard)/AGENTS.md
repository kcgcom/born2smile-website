# 관리자 워크스페이스

- `page.tsx`는 `/admin/operations/overview`로 리다이렉트한다. 예전 탭 컨테이너나 쿼리 파라미터 처리기로 설명하지 않는다.
- `layout.tsx`는 `AuthGuard` 안에 `AdminWorkspaceShell`을 배치한다.
- 현재 화면은 `operations/`, `analysis/`, `content/`, `system/`의 경로 기반 페이지다. 내비게이션 변경 시 `components/admin/AdminWorkspaceShell.tsx`와 실제 page 파일을 대조한다.
- `components/`는 화면 구현과 공유 UI를 담는다. 페이지에는 조합·라우팅을, 데이터·폼 로직에는 기존 컴포넌트와 훅을 사용한다.
- 포스트 편집·생성은 `content/posts/[slug]/page.tsx`, `content/posts/new/page.tsx`를 확인한다. 존재하지 않는 예전 growth 경로를 새 링크에 사용하지 않는다.
