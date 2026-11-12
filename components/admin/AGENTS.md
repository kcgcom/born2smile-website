# 관리자 공통 UI

- `AdminAuthProvider.tsx`가 관리자 표시 상태와 세션 감지를 공유한다. `hooks/useAdminAuth.ts`는 이를 재노출한다. 컴포넌트마다 중복 세션 구독을 추가하지 않는다.
- `AuthGuard.tsx`는 대시보드 진입을 보호하고 `AdminWorkspaceShell.tsx`는 현재 경로에 따른 워크스페이스 UI를 제공한다.
- `AdminFloatingButton.tsx`는 공개 화면의 관리자 진입 버튼이다. 블로그 편집 모드·관리자 경로에서의 숨김 동작을 보존한다.
- `AdminChrome.tsx`의 버튼·링크·표면·상태 UI를 재사용한다.
- `InlineBlogEditButton.tsx`, `InlineResearchEditButton.tsx`의 편집은 공개 표시와 분리하고, 저장 실패 시 작성 내용을 보존한다.
- `PublishPopup.tsx`, `AdminDraftBar.tsx`는 발행 흐름에 연결된다. 날짜 추천과 발행 요청은 `hooks/usePublishPopup.ts`도 함께 확인한다.
- 브라우저의 localStorage 플래그는 성능·표시 최적화용이다. 서버 접근은 관리자 API의 인증을 거쳐야 한다.
