# app/admin/

- `layout.tsx`는 관리자 영역의 검색 노출을 막고 공개 사이트의 전역 UI를 숨긴다.
- `login/page.tsx`는 Supabase Google OAuth 로그인 화면이다.
- `(dashboard)/layout.tsx`가 `AuthGuard`와 `AdminWorkspaceShell`을 적용한다. 로그인 화면까지 이 가드로 감싸지 않는다.
- `preview/[category]/[slug]/page.tsx`는 초안 미리보기 경로다. 공개 블로그의 발행일·발행 상태 필터와 미리보기 권한을 혼동하지 않는다.
- 클라이언트 가드는 UI 접근 제어다. 데이터 변경 권한은 관리자 API에서 다시 검증한다.
- 로그인·로그아웃 변경은 `lib/admin-auth.ts`, `components/admin/AuthGuard.tsx`, `components/admin/AdminAuthProvider.tsx`를 함께 확인한다.
