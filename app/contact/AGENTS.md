# 연락처·상담 안내

- `page.tsx`는 async 서버 컴포넌트이며 `getSiteClinic`, `getSiteHours`, `getSiteLinks`로 운영 설정을 조회한다.
- `layout.tsx`는 metadata와 구조화 데이터를 생성한다. 전화·주소·진료시간 변경은 화면과 이 레이아웃을 함께 확인한다.
- 운영 설정은 `/admin/system/settings`, 코드 기본값은 `lib/constants.ts`에서 관리한다.
- KakaoMap은 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`와 컴포넌트의 주소·좌표 로직을 사용한다. `components/ui/KakaoMap.tsx`를 확인한다.
- 전화·채널 링크는 실제 href와 추적 이벤트를 보존하고, 미설정 링크의 안내를 유지한다. 이 페이지를 예약 접수 폼으로 설명하지 않는다.
