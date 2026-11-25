---
name: website-ui-audit
description: 서울본치과 웹사이트의 UI 감사, 접근성, 디자인 토큰 일관성, 반응형 레이아웃 및 컴포넌트 품질을 점검할 때 사용한다. 단순 색상 변경, SEO, 마케팅 성과 분석에는 자동 적용하지 않는다.
---

# 웹사이트 UI 감사

1. 루트 및 대상 하위 AGENTS.md를 읽고 요청 범위와 변경 권한을 확인한다. 감사 요청만으로 수정하지 않는다.
2. DESIGN.md, app/globals.css, lib/fonts.ts 및 대상 컴포넌트의 실제 구현을 기준으로 삼는다. 관리자 UI는 기존 관리자 공통 패턴을 따른다.
3. 요청에 맞는 참조만 읽는다. 전체 감사에서는 세 영역을 모두 점검한다.
   - 접근성: [accessibility.md](references/accessibility.md)
   - 디자인 일관성: [design-consistency.md](references/design-consistency.md)
   - 반응형 UI: [responsive-ui.md](references/responsive-ui.md)
4. 코드 검사 후 가능한 경우 로컬 브라우저와 관련 Playwright 테스트로 재현한다. AGENTS.md의 fixture 및 검증 규칙을 따른다. 운영 데이터 변경, 실제 예약·문의 전송, 유료 도구 호출은 하지 않는다.
5. 이슈를 중복 제거하고 심각도, 파일:라인, 재현 조건, 근거, 수정 방향을 보고한다. 확인된 문제와 의심 사항을 구분하고 실행하지 못한 검사를 명시한다.
6. 수정 요청이 있는 경우만 수정하고 루트 지침에 따라 검증한다. 병렬 에이전트는 지원되는 환경에서 범위가 큰 경우에만 선택한다.

심각도: critical = 핵심 기능 이용 불가 또는 중대한 접근성 장애; major = 실질적인 사용성·접근성·디자인 문제; minor = 제한적인 일관성 또는 유지보수 문제. WCAG 위반 여부는 심각도와 별도로 기록한다.

마크업 일부만 제공된 경우 확인된 요소의 영향을 평가한다. 주요 동작을 수행하는 컨트롤의 키보드 조작 불가는 major로 보고하고, 대체 경로까지 막혀 핵심 과업을 수행할 수 없다고 확인되면 critical로 올린다.
