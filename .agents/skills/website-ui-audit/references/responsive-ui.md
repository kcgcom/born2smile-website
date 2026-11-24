# 반응형 UI 감사

- 대상 페이지와 공통 Header/Footer/CTA, 레이아웃 및 실제 CSS를 확인한다.
- 모바일 우선 브레이크포인트, 고정 폭, overflow, 줄바꿈, 겹침, 정보 계층, 이미지 크기·alt, 공통 모션 및 reduced-motion을 검사한다.
- 모바일·태블릿·데스크톱과 실제 브레이크포인트 전후에서 렌더링을 확인한다. 긴 한국어 문장, 확대, 메뉴·모달·고정 CTA도 점검한다.
- next/image 및 공통 컴포넌트 사용을 검토하되 정당한 예외를 구분한다.
- tests/에서 현재 관련 spec을 확인한다. 예: mobile-header.spec.ts, mobile-touch-targets.spec.ts, responsive-header-breakpoint.spec.ts, blog-responsive-ux.spec.ts, desktop-floating-cta.spec.ts.
- 루트 AGENTS.md의 Playwright 실행 및 fixture 규칙을 따른다. CTA 추적 계약을 보존하고 실제 연락·예약을 전송하지 않는다.
- 화면 조건, 재현 절차, 파일:라인, 관찰 결과를 기록한다. 브라우저 미실행 시 코드 기반 추정으로 표시한다.
