# Born2Smile 치과의원 홈페이지 개발 실행계획

> 경기도 김포시 소재 치과의원 | 참고 사이트: [블랑쉬치과 (blanche.kr)](https://www.blanche.kr/)

---

## 1. 프로젝트 개요

### 1.1 목표
- 경기도 김포시에 위치한 치과의원의 프리미엄 반응형 홈페이지 구축
- 블랑쉬치과(blanche.kr)의 고급스러운 UI/UX를 참고하되, 김포 지역 치과에 맞게 커스터마이징
- SEO 최적화를 통한 지역 검색("김포 치과", "김포시 치과의원") 상위 노출

### 1.2 기술 스택
| 구분 | 기술 | 선택 이유 |
|------|------|-----------|
| **프레임워크** | Next.js 15 (App Router) | SSR/SSG로 SEO 최적화, 이미지 최적화 내장 |
| **언어** | TypeScript | 타입 안정성, 유지보수성 |
| **스타일링** | Tailwind CSS 4 | 빠른 UI 구현, 반응형 디자인 |
| **애니메이션** | Framer Motion | 스크롤 애니메이션, 페이지 전환 효과 |
| **아이콘** | Lucide React | 경량 SVG 아이콘 |
| **폼 처리** | React Hook Form + Zod | 예약/상담 폼 유효성 검증 |
| **배포** | Vercel | Next.js 최적 호스팅, 자동 배포 |
| **패키지 매니저** | pnpm | 빠른 설치, 디스크 효율 |

---

## 2. 디자인 컨셉

### 2.1 블랑쉬치과 참고 요소
블랑쉬치과 사이트에서 차용할 핵심 디자인 패턴:

- **프리미엄 미니멀 레이아웃**: 넓은 여백, 깔끔한 타이포그래피
- **풀스크린 히어로 섹션**: 대형 비주얼 이미지 + 핵심 슬로건
- **Before/After 갤러리**: 시술 전후 비교 인터랙티브 슬라이더
- **의료진 소개 섹션**: 학력/경력 중심의 신뢰감 있는 프로필
- **스크롤 기반 애니메이션**: 섹션별 페이드인/슬라이드 효과
- **다국어 지원 구조**: 한국어 기본, 확장 가능한 i18n 구조

### 2.2 Born2Smile 커스터마이징 방향

| 블랑쉬치과 (참고) | Born2Smile (적용) |
|-------------------|-------------------|
| 강남/논현 프리미엄 감성 | 김포 지역 친근함 + 프리미엄 신뢰감 |
| 라미네이트 특화 | 종합 치과 진료 (임플란트, 교정, 심미, 일반) |
| 프렌치 감성 브랜딩 | 따뜻하고 편안한 "미소" 브랜딩 |
| 어두운 톤 고급 감성 | 밝고 깨끗한 톤 + 포인트 컬러 |

### 2.3 컬러 시스템
```
Primary:      #2563EB (Trust Blue)     - 신뢰감, 전문성
Secondary:    #0EA5E9 (Sky Blue)       - 청결, 상쾌함
Accent:       #F59E0B (Warm Gold)      - 프리미엄, 따뜻함
Background:   #FAFBFC (Cool White)     - 깨끗함, 여백
Surface:      #FFFFFF (Pure White)     - 카드, 컨테이너
Text Primary: #111827 (Near Black)     - 본문 텍스트
Text Muted:   #6B7280 (Gray)           - 보조 텍스트
```

### 2.4 타이포그래피
- **한글**: Pretendard (본문), Noto Serif KR (강조/헤드라인)
- **영문**: Inter (본문), Playfair Display (로고/강조)
- **크기 체계**: 모바일 우선 반응형 (base 16px)

---

## 3. 사이트맵 및 페이지 구성

```
Born2Smile 치과의원
├── / (메인 홈페이지)
├── /about (병원 소개)
│   ├── 인사말 / 철학
│   ├── 의료진 소개
│   ├── 시설 안내 (내부 사진 갤러리)
│   └── 오시는 길
├── /treatments (진료 안내)
│   ├── /treatments/implant (임플란트)
│   ├── /treatments/orthodontics (치아교정)
│   ├── /treatments/cosmetic (심미치료 - 라미네이트, 미백 등)
│   ├── /treatments/general (일반진료 - 충치, 신경치료 등)
│   ├── /treatments/pediatric (소아치과)
│   └── /treatments/preventive (예방치료 - 스케일링, 검진)
├── /gallery (치료 사례)
│   └── Before/After 갤러리
├── /guide (진료 안내)
│   ├── 진료시간 안내
│   ├── 비급여 수가표
│   └── 초진 안내
├── /community (커뮤니티)
│   ├── 공지사항
│   └── 블로그/칼럼
└── /contact (예약/상담)
    ├── 온라인 예약
    └── 카카오톡 상담 연결
```

---

## 4. 페이지별 상세 설계

### 4.1 메인 페이지 (`/`)
블랑쉬치과의 풀스크린 히어로 + 섹션 스크롤 구조 참고

| 순서 | 섹션 | 내용 |
|------|------|------|
| 1 | **히어로** | 풀스크린 이미지/비디오 + "당신의 미소를 디자인합니다" 슬로건 + CTA(예약하기) |
| 2 | **병원 소개** | 간단한 인사말 + 핵심 가치 3가지 (신뢰, 정성, 미소) |
| 3 | **진료 분야** | 아이콘 카드 그리드 (임플란트, 교정, 심미, 일반, 소아, 예방) |
| 4 | **의료진** | 대표원장 프로필 + 학력/경력 하이라이트 |
| 5 | **Before/After** | 시술 전후 비교 슬라이더 (블랑쉬 스타일) |
| 6 | **시설 안내** | 내부 사진 가로 스크롤 갤러리 |
| 7 | **환자 후기** | 카드 캐러셀로 실제 후기 노출 |
| 8 | **오시는 길** | 카카오맵 임베드 + 주소/전화번호/진료시간 |
| 9 | **CTA 배너** | "지금 바로 상담 예약하세요" + 전화/카카오톡 버튼 |

### 4.2 병원 소개 (`/about`)
- 인사말: 원장님 사진 + 철학 메시지 (블랑쉬의 "치료가 아닌 디자인" 컨셉 참고)
- 의료진: 카드 레이아웃, 학력/자격/전문분야 명시
- 시설: 라이트박스 갤러리 (진료실, 대기실, 상담실, 소독실 등)
- 오시는 길: 카카오맵 + 대중교통/자가용 안내

### 4.3 진료 안내 (`/treatments/*`)
- 각 진료 분야별 개별 페이지
- 구성: 시술 설명 → 과정 안내(스텝) → 장점 → FAQ 아코디언
- 블랑쉬의 "솔루션" 페이지 레이아웃 참고

### 4.4 치료 사례 (`/gallery`)
- Before/After 인터랙티브 슬라이더 (블랑쉬 핵심 참고 요소)
- 카테고리별 필터링 (임플란트, 교정, 심미 등)
- 라이트박스 확대 보기

### 4.5 진료 안내 (`/guide`)
- 진료시간 테이블 (요일별)
- 비급여 수가표 (블랑쉬의 `/price.php` 참고)
- 초진 환자 안내 플로우

### 4.6 예약/상담 (`/contact`)
- 온라인 예약 폼 (이름, 연락처, 희망일시, 진료과목, 메시지)
- 카카오톡 채널 연결 버튼
- 전화 바로걸기 (모바일)

---

## 5. 공통 컴포넌트

### 5.1 헤더/네비게이션
- **데스크톱**: 고정 상단 네비바, 로고 좌측, 메뉴 중앙/우측, 예약 CTA 버튼
- **모바일**: 햄버거 메뉴 + 풀스크린 오버레이 네비게이션
- 스크롤 시 배경색 변경 (투명 → 흰색)
- 드롭다운 메가메뉴 (진료 안내 하위 메뉴)

### 5.2 풋터
- 병원 정보 (상호, 주소, 대표번호, 사업자등록번호)
- 진료시간 요약
- SNS 링크 (인스타그램, 카카오톡, 네이버 블로그)
- 개인정보처리방침 / 이용약관 링크

### 5.3 플로팅 요소
- **플로팅 CTA**: 우하단 카카오톡 상담 버튼 (항상 노출)
- **모바일 하단 고정 바**: 전화걸기 / 카카오톡 / 오시는 길 / 예약

---

## 6. 개발 단계별 실행 계획

### Phase 1: 프로젝트 초기화 및 기반 구축
```
예상 작업 목록:
├── Next.js 15 프로젝트 초기화 (TypeScript, App Router)
├── Tailwind CSS 4 설정
├── 디렉토리 구조 설계
│   ├── app/           (라우트)
│   ├── components/    (공통 컴포넌트)
│   │   ├── ui/        (기본 UI 요소)
│   │   ├── layout/    (헤더, 풋터, 네비게이션)
│   │   └── sections/  (페이지 섹션 컴포넌트)
│   ├── lib/           (유틸리티, 상수)
│   ├── public/        (이미지, 폰트, 파비콘)
│   └── styles/        (글로벌 스타일)
├── 폰트 설정 (Pretendard, Noto Serif KR)
├── 컬러 시스템 및 디자인 토큰 설정
├── ESLint + Prettier 설정
└── 기본 레이아웃 (RootLayout) 구현
```

### Phase 2: 공통 컴포넌트 개발
```
├── Header (반응형 네비게이션)
│   ├── 데스크톱 메뉴
│   ├── 모바일 햄버거 메뉴
│   └── 스크롤 기반 스타일 변경
├── Footer
├── 플로팅 CTA 버튼
├── 모바일 하단 고정 바
├── UI 컴포넌트
│   ├── Button (variants: primary, secondary, outline, ghost)
│   ├── Card
│   ├── Section (공통 섹션 래퍼)
│   ├── SectionTitle
│   ├── Accordion (FAQ용)
│   ├── ImageSlider (Before/After)
│   └── LightboxGallery
└── SEO 컴포넌트 (메타태그, 구조화 데이터)
```

### Phase 3: 메인 페이지 개발
```
├── 히어로 섹션 (풀스크린 + 슬로건 + CTA)
├── 병원 소개 요약 섹션
├── 진료 분야 카드 그리드
├── 의료진 소개 섹션
├── Before/After 슬라이더 섹션
├── 시설 안내 가로 스크롤
├── 환자 후기 캐러셀
├── 오시는 길 (카카오맵)
├── CTA 배너
└── 스크롤 애니메이션 적용 (Framer Motion)
```

### Phase 4: 서브 페이지 개발
```
├── /about (병원 소개)
│   ├── 인사말 페이지
│   ├── 의료진 상세 페이지
│   ├── 시설 갤러리 페이지
│   └── 오시는 길 페이지
├── /treatments (진료 안내)
│   ├── 진료 분야 목록 페이지
│   └── 개별 진료 상세 페이지 (6개)
├── /gallery (치료 사례)
│   └── Before/After 갤러리 페이지
├── /guide (진료 안내)
│   ├── 진료시간 안내
│   ├── 비급여 수가표
│   └── 초진 안내
└── /contact (예약/상담)
    └── 온라인 예약 폼 페이지
```

### Phase 5: SEO 및 성능 최적화
```
├── 메타데이터 최적화
│   ├── 각 페이지별 title, description
│   ├── Open Graph 태그 (카카오톡/SNS 공유)
│   └── JSON-LD 구조화 데이터 (LocalBusiness, DentalClinic)
├── sitemap.xml 자동 생성
├── robots.txt 설정
├── 이미지 최적화 (next/image, WebP)
├── 폰트 최적화 (next/font)
├── Core Web Vitals 튜닝
│   ├── LCP 최적화
│   ├── CLS 방지
│   └── FID/INP 개선
└── 네이버/구글 검색등록 준비
    ├── 네이버 서치어드바이저
    └── Google Search Console
```

### Phase 6: 최종 점검 및 배포
```
├── 크로스 브라우저 테스트 (Chrome, Safari, Firefox, Edge)
├── 반응형 테스트 (모바일, 태블릿, 데스크톱)
├── 접근성 점검 (WCAG 2.1 AA)
├── 성능 테스트 (Lighthouse 90+ 목표)
├── 도메인 연결 및 SSL 인증서
├── Vercel 배포
├── 네이버 플레이스/지도 등록
└── Google My Business 등록
```

---

## 7. 디렉토리 구조 (상세)

```
born2smile-website/
├── app/
│   ├── layout.tsx                 # 루트 레이아웃
│   ├── page.tsx                   # 메인 페이지
│   ├── globals.css                # 글로벌 스타일
│   ├── about/
│   │   └── page.tsx               # 병원 소개
│   ├── treatments/
│   │   ├── page.tsx               # 진료 분야 목록
│   │   └── [slug]/
│   │       └── page.tsx           # 개별 진료 상세
│   ├── gallery/
│   │   └── page.tsx               # 치료 사례
│   ├── guide/
│   │   └── page.tsx               # 진료 안내
│   ├── community/
│   │   └── page.tsx               # 공지사항/블로그
│   ├── contact/
│   │   └── page.tsx               # 예약/상담
│   ├── sitemap.ts                 # 사이트맵 생성
│   └── robots.ts                  # robots.txt 생성
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── MobileNav.tsx
│   │   └── FloatingCTA.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Section.tsx
│   │   ├── SectionTitle.tsx
│   │   ├── Accordion.tsx
│   │   ├── BeforeAfterSlider.tsx
│   │   └── LightboxGallery.tsx
│   └── sections/
│       ├── HeroSection.tsx
│       ├── IntroSection.tsx
│       ├── TreatmentsGrid.tsx
│       ├── DoctorSection.tsx
│       ├── BeforeAfterSection.tsx
│       ├── FacilitySection.tsx
│       ├── TestimonialsSection.tsx
│       ├── MapSection.tsx
│       └── CTABanner.tsx
├── lib/
│   ├── constants.ts               # 상수 (병원 정보, 진료시간 등)
│   ├── treatments.ts              # 진료 분야 데이터
│   └── metadata.ts                # SEO 메타데이터 헬퍼
├── public/
│   ├── images/
│   │   ├── hero/
│   │   ├── doctors/
│   │   ├── facility/
│   │   ├── treatments/
│   │   └── gallery/
│   ├── fonts/
│   └── favicon.ico
├── styles/
│   └── animations.css             # 커스텀 애니메이션
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

---

## 8. 핵심 기능 구현 가이드

### 8.1 Before/After 슬라이더 (블랑쉬 핵심 참고)
```
- 드래그/터치로 좌우 비교 가능한 인터랙티브 슬라이더
- 모바일 터치 제스처 지원
- next/image로 이미지 최적화
- Framer Motion으로 초기 애니메이션
```

### 8.2 카카오맵 연동
```
- 카카오맵 JavaScript SDK 사용
- 병원 위치 마커 + 커스텀 인포윈도우
- 길찾기 버튼 연동
```

### 8.3 예약 폼
```
- React Hook Form + Zod 유효성 검증
- 필드: 이름, 연락처, 희망일시(date picker), 진료과목(select), 메시지
- 제출 후 카카오톡 알림톡 또는 이메일 알림 (향후 확장)
- 초기에는 카카오톡 채널로 리다이렉트 방식도 고려
```

### 8.4 스크롤 애니메이션
```
- Framer Motion의 useInView 활용
- 섹션 진입 시: fade-up, slide-in 효과
- 스태거 애니메이션 (카드 그리드 순차 등장)
- 헤더 스크롤 시 배경 전환
```

---

## 9. 콘텐츠 준비 체크리스트

실제 개발 전/중에 준비해야 할 콘텐츠:

- [ ] 병원 로고 (SVG 형식 권장)
- [ ] 원장님 인사말 텍스트
- [ ] 의료진 프로필 사진 및 약력
- [ ] 병원 내부/외부 사진 (고해상도)
- [ ] 진료 분야별 설명 텍스트
- [ ] Before/After 사진 (환자 동의 필요)
- [ ] 환자 후기 (동의하에 수집)
- [ ] 진료시간 정보
- [ ] 비급여 수가표
- [ ] 병원 주소, 전화번호, 사업자등록번호
- [ ] 카카오톡 채널 ID
- [ ] 카카오맵 API 키
- [ ] 파비콘 및 OG 이미지

> **참고**: 콘텐츠가 준비되기 전에는 플레이스홀더 이미지/텍스트로 개발을 진행하고,
> 실제 콘텐츠가 준비되면 교체하는 방식으로 진행합니다.

---

## 10. 향후 확장 고려사항

- **다국어 지원**: next-intl을 활용한 영문/일문 페이지 (블랑쉬처럼)
- **블로그/칼럼**: MDX 기반 치과 건강 정보 콘텐츠
- **온라인 예약 시스템**: 실시간 예약 캘린더 + 알림톡 연동
- **관리자 페이지**: 예약 관리, 후기 관리, 콘텐츠 수정
- **챗봇**: AI 기반 간단 상담 (진료 분야 안내, FAQ 응대)
- **환자 포털**: 진료 기록 조회, 다음 예약 안내
