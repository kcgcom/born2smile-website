---
name: ui-page-scan
description: born2smile 웹사이트 페이지 UI를 코드 기반으로 점검하는 스킬. 레이아웃 깨짐, Tailwind 클래스 오용, 반응형 브레이크포인트 누락, 컴포넌트 불일치를 발굴한다. ui-inspector 에이전트가 사용.
---

# UI Page Scan

born2smile Next.js 페이지의 UI 코드를 체계적으로 읽어 시각적 문제를 발굴한다.

## 점검 체크리스트

### 1. 레이아웃 구조
- `section-padding`, `container-narrow` 커스텀 클래스 준수 여부
- `max-w-*` 컨테이너가 일관된 값을 사용하는지 (임의값 `[1200px]` 등 회피)
- `flex` / `grid` 레이아웃이 의도한 대로 구성되어 있는지

### 2. 반응형 브레이크포인트
- 모바일 퍼스트(기본 → `sm:` → `md:` → `lg:`) 순서 준수
- 브레이크포인트 없이 고정 너비 사용하는 경우 탐지
- 텍스트 크기가 뷰포트에 따라 적절히 조정되는지

### 3. Tailwind 클래스 품질
- 임의값 `[#xxx]`, `[16px]`, `[1.5rem]` 사용 위치 → 토큰/변수로 대체 가능한지 확인
- 동일 목적에 다른 클래스 혼용 (예: `p-4` vs `p-[16px]`)
- 불필요한 `!important` 또는 `!` 접두사 사용

### 4. 컴포넌트 재사용
- `components/ui/Motion.tsx`의 `<FadeIn>`, `<StaggerContainer>` 사용 여부
- `components/ui/CTABanner.tsx` 중복 구현 여부
- inline style 사용 여부 (`style={{ }}`)

### 5. 이미지·미디어
- `next/image` 사용 여부 (`<img>` 태그 직접 사용 금지)
- `width`, `height` 또는 `fill` prop 지정 여부
- `alt` 텍스트 품질

## 점검 순서

```
1. app/globals.css → 커스텀 유틸리티 클래스 목록 파악
2. 각 페이지 TSX 순서대로 읽기
3. 위 체크리스트 항목별 Grep 보완 수행
4. 이슈 수집 → 심각도 분류 (🔴 critical / 🟡 major / 🟢 minor)
5. _workspace/ui-inspector-report.md에 저장
```

## 심각도 기준

| 심각도 | 기준 |
|--------|------|
| 🔴 critical | 특정 뷰포트에서 콘텐츠가 잘리거나 레이아웃이 겹침 |
| 🟡 major | 시각적 일관성 파괴, 브랜드 이탈 |
| 🟢 minor | 코드 품질 개선, 미래 유지보수 편의 |
