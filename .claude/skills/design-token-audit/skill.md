---
name: design-token-audit
description: born2smile globals.css의 디자인 토큰과 실제 코드 사용 현황을 교차 비교하는 스킬. 하드코딩된 색상/간격값, 브랜드 색상 이탈, 폰트 오용을 발굴한다. design-consistency 에이전트가 사용.
---

# Design Token Audit

`app/globals.css`의 `@theme` 블록을 기준으로 토큰 준수 여부를 점검한다.

## 점검 순서

### Step 1: 토큰 카탈로그 구축
`app/globals.css`를 읽어 `@theme` 블록의 모든 토큰 목록화:
- 색상 토큰: `--color-*`
- 폰트 토큰: `--font-*`
- 간격/사이즈 토큰: 정의된 경우

### Step 2: 하드코딩 탐색

```bash
# 하드코딩된 색상값
grep -rn "\[#[0-9a-fA-F]\{3,6\}\]" app/ components/ --include="*.tsx" --include="*.css"
grep -rn "rgb(" app/ components/ --include="*.tsx"
grep -rn "hsl(" app/ components/ --include="*.tsx"

# 하드코딩된 크기값 (Tailwind 임의값)
grep -rn "\[[0-9]\+px\]" app/ components/ --include="*.tsx"
grep -rn "\[[0-9.]\+rem\]" app/ components/ --include="*.tsx"

# inline style
grep -rn 'style={{' app/ components/ --include="*.tsx"
```

### Step 3: 브랜드 색상 준수
born2smile 색상 시스템: **Blue(전문성/신뢰) + Gold(따뜻함/프리미엄)**

- 정의된 컬러 팔레트 외 색상 사용 여부
- primary/secondary 버튼 색상 일관성
- 링크 색상 일관성

### Step 4: 타이포그래피 준수
| 클래스 | 폰트 | 올바른 용도 |
|--------|------|------------|
| `font-sans` | Pretendard | 본문, UI 텍스트 |
| `font-serif` / `.font-headline` | Noto Serif KR | 섹션 헤드라인 |
| `.font-greeting` | Gowun Batang | 인사말 편지 카드만 |

`.font-greeting`이 인사말 카드(`.greeting-letter`) 외에 사용되는 경우 이슈로 분류.

### Step 5: 커스텀 유틸리티 클래스 우회
- `.section-padding` 대신 임의 패딩 직접 지정 여부
- `.container-narrow` 대신 임의 `max-w-*` 사용 여부

## 이슈 심각도

| 심각도 | 기준 |
|--------|------|
| 🔴 critical | 브랜드 색상과 완전히 다른 색상 직접 사용 |
| 🟡 major | 토큰 있는데 하드코딩, 폰트 오용 |
| 🟢 minor | 임의 간격값, 코드 일관성 |
