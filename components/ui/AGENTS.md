# 공용 UI

- `Motion.tsx`의 FadeIn·StaggerContainer·StaggerItem을 사용한다. IntersectionObserver 정리와 prefers-reduced-motion 대응을 유지한다.
- `KakaoMap.tsx`는 브라우저 SDK를 비동기 로드한다. `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`, 기존 SDK 재사용, 실패 시 안내를 유지한다.
- 지도는 여러 페이지에서 사용한다. 주소·좌표·마커 변경은 호출 페이지 전체에서 확인한다.
- `CTABanner.tsx`는 공통 상담 안내, `ScrollIndicator.tsx`는 스크롤 안내다. 기존 디자인 토큰과 시맨틱 링크·버튼을 사용한다.
- FAQ는 각 페이지의 네이티브 details/summary 구현을 확인한다. 삭제된 공통 아코디언을 전제로 작업하지 않는다.
