# 공유 훅

- `useAdminAuth.ts`는 `components/admin/AdminAuthProvider.tsx`의 훅을 재노출한다. 인증 구독·플래그 처리의 실제 구현은 Provider에 있다.
- `usePublishPopup.ts`는 발행 팝업 상태·일정 추천·발행 요청을 관리한다. `components/admin/PublishPopup.tsx`와 관리자 블로그 API의 계약을 함께 확인한다.
- 발행일 추천은 `lib/publish-schedule.ts`, 오늘 날짜는 `lib/date.ts`의 KST 기준을 사용한다. 조회 실패를 기본 요일·빈 예약 목록으로 바꾸지 않는다.
- `useModalA11y.ts`는 Escape, 포커스 트랩, 열기 전 포커스 복귀를 제공한다. 반환 ref를 실제 모달 컨테이너에 연결하고 이벤트를 정리한다.
- 훅의 재사용은 중복 구독·요청을 늘리지 않아야 한다. 저장·발행 실패 시 오류와 작성 상태를 유지한다.
