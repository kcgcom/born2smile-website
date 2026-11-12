# 공통 컴포넌트

- `layout/`는 전역 UI, `ui/`는 공용 UI·모션·지도, `blog/`는 블로그 표시·편집, `admin/`는 인증·관리자 UI다. `analytics/`와 `research/`도 별도 컴포넌트를 제공한다.
- 서버 컴포넌트를 기본으로 하고 상호작용이 필요한 경계에만 use client를 둔다. 디렉터리 전체가 클라이언트라고 가정하지 않는다.
- 전역 디자인은 `DESIGN.md`, 토큰은 `app/globals.css`, 폰트는 `lib/fonts.ts`를 따른다.
- CTA 변경은 `analytics/TrackedAnchor.tsx`, `analytics/TrackedLink.tsx`의 추적 이벤트·속성을 보존한다.
- 관리자 표시 상태는 `AdminAuthProvider`와 `hooks/useAdminAuth.ts`를 재사용한다. UI 표시 여부를 서버 권한 검증으로 간주하지 않는다.
- 모달·메뉴의 포커스 복귀, Escape, 스크롤 잠금 해제와 reduced-motion 처리를 유지한다.
