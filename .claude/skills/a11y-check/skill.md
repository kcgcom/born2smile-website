---
name: a11y-check
description: born2smile 웹사이트 접근성(WCAG 2.1 AA)을 코드 기반으로 점검하는 스킬. 시맨틱 HTML, ARIA 오용, 키보드 포커스, 색 대비, 폼 레이블을 분석한다. a11y-auditor 에이전트가 사용.
---

# A11y Check

WCAG 2.1 AA 기준으로 born2smile 코드베이스의 접근성 문제를 발굴한다.

## 점검 체크리스트

### 1. 시맨틱 HTML (WCAG 1.3.1)
- heading hierarchy: `h1`→`h2`→`h3` 순서가 건너뛰지 않는지
- `<main>`, `<nav>`, `<header>`, `<footer>`, `<section>`, `<article>` landmark 사용
- 버튼 역할에 `<button>` 사용 (클릭 핸들러 있는 `<div>` 금지)

### 2. ARIA 레이블 (WCAG 4.1.2)
- 아이콘 전용 버튼에 `aria-label` 존재 여부
- `aria-expanded`, `aria-controls`가 아코디언/드롭다운에 올바르게 구현되었는지
- `role` 속성 오용 (`role="button"` on non-interactive element)

### 3. 키보드 내비게이션 (WCAG 2.1.1)
- skip link 존재 여부 (`#main-content` 등)
- `focus-visible` 스타일 정의 여부 (`globals.css` 확인)
- 모달/드롭다운에서 포커스 트랩 구현 여부
- `tabIndex={-1}` 올바른 사용 여부

### 4. 색 대비 (WCAG 1.4.3 / 1.4.11)
`app/globals.css`의 CSS 변수를 읽어 주요 텍스트 색상과 배경 조합 계산:
- 일반 텍스트: 4.5:1 이상
- 대형 텍스트(18px bold 이상): 3:1 이상
- UI 컴포넌트 경계: 3:1 이상

### 5. 이미지 대체 텍스트 (WCAG 1.1.1)
- 의미 있는 이미지: 내용을 설명하는 `alt`
- 장식 이미지: `alt=""`
- `next/image` 사용 시 `alt` prop 누락 여부

### 6. 폼 접근성 (WCAG 1.3.1, 3.3.2)
- `<label>` for/id 연결 또는 `aria-label`
- 에러 메시지가 `aria-describedby`로 연결되어 있는지
- 필수 필드 `required` 또는 `aria-required` 표시

## 색 대비 계산법

```
sRGB 상대 휘도:
C = c/255 <= 0.04045 ? c/255/12.92 : ((c/255+0.055)/1.055)^2.4
L = 0.2126*R + 0.7152*G + 0.0722*B
대비비 = (L_lighter + 0.05) / (L_darker + 0.05)
```

주요 토큰 쌍 반드시 확인: 본문 텍스트/배경, primary 버튼/텍스트, secondary 버튼/텍스트

## WCAG 기준 번호 참조

| 번호 | 항목 |
|------|------|
| 1.1.1 | 비텍스트 콘텐츠 |
| 1.3.1 | 정보와 관계 |
| 1.4.3 | 명도 대비 |
| 2.1.1 | 키보드 |
| 4.1.2 | 이름, 역할, 값 |
