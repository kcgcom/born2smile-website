# DESIGN.md

## Purpose

이 문서는 서울본치과 웹사이트의 시각 규칙을 고정한다. 목표는 새 페이지나 섹션을 만들 때도 항상 "서울본치과답게" 보이도록 하는 것이다.

핵심 인상:

- 전문적이다
- 정직하다
- 무섭지 않다
- 설명을 잘해줄 것 같다
- 환자를 급하게 몰아붙이지 않는다

## Brand Direction

- 밝고 깨끗한 라이트 테마를 기본으로 한다.
- 블루는 신뢰와 행동 유도, 골드는 절제된 온기와 프리미엄 포인트에 쓴다.
- 의료 정보 안내서처럼 차분해야 하며, 세일즈 랜딩페이지처럼 보이면 안 된다.
- 사용자는 "구매자"보다 "불안과 궁금증을 가진 환자"에 가깝다.

## Color Tokens

기존 토큰만 사용한다. 새 브랜드 색은 임의로 추가하지 않는다.

- Primary: `#2563EB`
- Primary Dark: `#1D4ED8`
- Primary Light: `#3B82F6`
- Secondary Blue: `#0EA5E9`
- Gold: `#C9962B`
- Gold Dark: `#A67B1E`
- Gold Light: `#D4B869`
- Gold Text: `#7A5A12`
- Gold Background: `#FDF3E0`
- Background: `#FAFBFC`
- Surface: `#FFFFFF`
- Foreground: `#111827`
- Muted: `#6B7280`
- Muted Light: `#9CA3AF`
- Border: `#E5E7EB`

사용 규칙:

- Primary는 주요 CTA, 활성 상태, 링크, 포커스에 쓴다.
- Gold는 넓은 면적보다 섹션 라벨, 번호, 구분선, 짧은 포인트에 쓴다.
- 빨강, 보라, 네온, 과한 글로우 계열은 기본 UI에서 피한다.
- 다크 테마를 전제로 만들지 않는다.

## Typography

폰트 역할:

- 본문: `Pretendard Variable`
- 헤드라인: `Noto Serif KR`
- 감성 포인트: `Gowun Batang`

유틸리티:

- `font-sans`: 일반 본문, 버튼, 폼, 내비게이션
- `font-headline`: 히어로/섹션 제목
- `font-greeting`: 인사말 편지 스타일 전용

대표 스케일:

- Hero `h1`: `text-4xl md:text-5xl lg:text-6xl`
- Section `h2`: `text-3xl md:text-4xl`
- Body lead: `text-lg md:text-xl`
- Card title: `text-lg`
- Section label: `text-sm tracking-widest uppercase`

타이포 규칙:

- 큰 제목은 단정하고 신뢰감 있어야 한다.
- 본문은 설명형 문장으로 자연스럽게 읽혀야 한다.
- 영문 레이블은 가능하지만 장식 수준으로만 사용한다.
- 한국어 장문은 줄 길이를 짧게 유지한다.

## Layout

기본 유틸리티를 우선 재사용한다.

- `section-padding`: 공통 섹션 여백
- `container-narrow`: 기본 섹션 컨테이너
- `font-headline`
- `font-greeting`
- `greeting-letter`

폭 기준:

- 헤더/전역 바: `max-w-7xl`
- 일반 섹션: `max-w-6xl`
- 좁은 본문/편지형 섹션: `max-w-4xl` ~ `max-w-2xl`

레이아웃 규칙:

- 모바일 우선으로 설계한다.
- 모바일 1열, 태블릿 2열, 데스크톱 3열이 기본 그리드 패턴이다.
- 넉넉한 세로 여백을 유지한다.
- 정보는 촘촘히 몰아넣지 않는다.

## Core Components

### Header

- 고정 헤더를 사용한다.
- 초기 상태는 가볍게, 스크롤 후에는 `white/95 + blur + thin border + soft shadow`.
- 모바일에서는 전화 CTA와 메뉴 버튼이 우선이다.

### Primary CTA

- 형태: 둥근 pill 버튼
- 배경: `--color-primary`
- 텍스트: 흰색
- hover: `--color-primary-dark`
- 느낌: 친절하고 안정적이어야 하며 공격적이면 안 된다

대표 패턴:

```tsx
className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] sm:px-8 sm:py-4 sm:text-base"
```

### Secondary CTA

- 형태: 둥근 pill 버튼
- 스타일: 흰색/투명 배경 + primary border + primary text
- 역할: 전화 상담, 보조 액션

대표 패턴:

```tsx
className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)] px-5 py-3 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/5 sm:px-8 sm:py-4 sm:text-base"
```

### Cards

- 흰 배경
- 얇은 경계선
- 낮고 부드러운 그림자
- hover는 가능하지만 떠오르는 정도는 작게 유지

### Section Label

- 제목 위 작은 라벨
- 보통 `text-sm tracking-widest uppercase text-[var(--color-gold-text)]`
- 한국어만 쓸 때는 uppercase 집착보다 자간과 톤 유지가 우선

### Greeting Letter

- 예외적으로 따뜻한 감성을 주는 블록
- 크림 톤 배경, 골드 라인, 부드러운 shadow
- `font-greeting` 사용
- 인사말 같은 제한된 영역에만 사용

## Motion

- `FadeIn`, `Stagger` 기반의 부드러운 등장 애니메이션을 사용한다.
- 모션은 안내를 돕는 수준이어야 한다.
- `prefers-reduced-motion`을 존중한다.

피할 것:

- 과한 parallax
- dramatic zoom
- 과속 carousel
- attention-seeking animation

## Accessibility

- 텍스트 확대를 막지 않는다.
- 포커스 링은 분명해야 한다.
- 모바일 터치 타겟은 최소 44px 수준을 유지한다.
- 전화 버튼, 메뉴 버튼, 주요 CTA는 작은 화면에서도 즉시 누를 수 있어야 한다.

## Content Tone In UI

- 친절하고 설명적이어야 한다.
- 환자의 불안, 통증, 일정, 과잉진료 우려를 이해하는 어조를 유지한다.
- 겁을 주거나 조급하게 만드는 표현을 피한다.

피할 문법:

- "최고"
- "압도적"
- "파격"
- "지금 안 하면 늦습니다"

## Do / Don't

Do:

- 밝고 깨끗한 화면 유지
- 블루 중심, 골드는 절제된 포인트로 사용
- 세리프 헤드라인으로 신뢰감 확보
- 넉넉한 여백과 읽기 쉬운 폭 유지
- CTA는 명확하지만 차분하게 배치

Don't:

- 다크 테마 기반 전환
- 과한 그라데이션, 유리효과, 네온 효과
- SaaS 스타트업 랜딩페이지 같은 톤
- 럭셔리 호텔 브로셔 같은 과장된 프리미엄 톤
- 과도한 CTA 반복
- 감성 폰트의 전역 본문 확장

## Prompt Guide

새 UI 생성 시 아래 방향을 따른다.

- "clean Korean dental clinic website"
- "trustworthy local healthcare brand in Gimpo"
- "bright editorial medical landing page"
- "calm blue and restrained gold palette"
- "serif headlines with high Korean readability"
- "soft cards, generous whitespace, honest CTA hierarchy"
- "no dark mode, no neon, no generic SaaS aesthetic"
- "avoid luxury-hotel aesthetic"
