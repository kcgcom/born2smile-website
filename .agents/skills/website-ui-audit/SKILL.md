---
name: website-ui-audit
description: 서울본치과 웹사이트의 접근성, 반응형 레이아웃, 디자인 일관성을 감사할 때 사용한다. 단순 색상·문구 변경에는 적용하지 않는다.
---

# 웹사이트 UI 감사

- 공개 UI의 기준은 [DESIGN.md](../../../DESIGN.md), 실제 색상·간격 토큰과 폰트는 [globals.css](../../../app/globals.css)와 [fonts.ts](../../../lib/fonts.ts)다. 모바일 터치 목표는 DESIGN.md의 44px 수준을 적용한다.
- 관리자 UI는 [AdminChrome](../../../components/admin/AdminChrome.tsx)과 해당 화면의 공통 컴포넌트를 기준으로 삼는다. [관리자 UI 지침](../../../components/admin/AGENTS.md)을 참고한다.
- 모바일 메뉴와 터치 영역은 [헤더 테스트](../../../tests/mobile-header.spec.ts), [터치 영역 테스트](../../../tests/mobile-touch-targets.spec.ts), [로컬 테스트 환경](../../../README.md)을 참고한다. 전화·예약 링크의 목적지와 이벤트는 테스트 환경에서 확인한다.
