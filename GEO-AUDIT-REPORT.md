# GEO Audit Report: 서울본치과 (born2smile.co.kr)

**감사일:** 2026-05-16  
**검증 갱신일:** 2026-05-16  
**URL:** https://www.born2smile.co.kr  
**비즈니스 유형:** 로컬 비즈니스 (치과 의원)  
**분석 페이지 수:** 112개 (live `sitemap.xml` 기준)

---

## Executive Summary

**전체 판단: 기술 기반은 양호, 개선 포인트는 엔티티 확장과 콘텐츠 신뢰 보강**

서울본치과 사이트는 Google Search와 일반 AI 크롤러가 읽기 쉬운 기반을 이미 잘 갖추고 있습니다. 주요 강점은 ①SSR/SSG 기반의 실제 HTML 본문 노출, ②`robots.txt`와 `sitemap.xml`의 정상 운영, ③`Dentist`/`MedicalBusiness`/`Physician`/`FAQPage`/`BlogPosting` 등 구조화 데이터 적용, ④의료진 자격과 진료 정보의 명확한 공개입니다.

이번 검증에서 기존 초안 보고서의 핵심 주장 중 두 가지는 사실과 달랐습니다.

- `llms.txt`는 빈 파일이 아닙니다. 현재 라이브와 로컬 모두 내용이 채워져 있습니다.
- 블로그 본문은 서버 렌더링 HTML에 포함되어 있습니다. AI 크롤러가 본문 텍스트를 읽을 수 있습니다.

현재 우선순위가 높은 개선 항목은 다음 3가지입니다.

1. SNS/외부 프로필 링크 확장으로 `sameAs` 엔티티 그래프 보강
2. 진료 상세 페이지의 `HowTo` 스키마 실제 렌더링
3. 블로그/진료 콘텐츠에 출처, 수치, 저자 신뢰 요소 보강

---

## 이번 검증에서 바로 확인한 사실

### 확인 완료

- `https://www.born2smile.co.kr/llms.txt`는 **빈 파일이 아님**
  - 로컬 `public/llms.txt`: `5395` bytes
  - 라이브 응답도 동일하게 내용 존재
- 블로그 본문은 **SSR HTML에 포함됨**
  - 검증 URL: `/blog/implant/implant-eligibility-checklist`
  - 제목, 부제, 본문 단락, 저자 표기, 면책문구 모두 HTML에서 확인
- `sitemap.xml` URL 수는 **112개**
- `robots.txt`는 주요 AI 크롤러를 명시적으로 허용
- `LINKS.kakaoChannel`, `LINKS.instagram`, `LINKS.naverBlog`는 현재 비어 있음
- `getHowToJsonLd()`는 구현되어 있으나 실제 페이지에서는 렌더링되지 않음

### 검증 결과 stale 또는 오판이었던 항목

- “`llms.txt` 빈 파일” 주장은 무효
- “블로그 본문이 HTML에 없음” 주장은 무효
- “`WebSite + SearchAction` 구현됨” 주장은 무효
  - 실제 구현은 `WebSite`만 존재하고 `SearchAction`은 없음
- “모든 페이지가 동일 OG 이미지 사용” 주장은 현재 stale
  - 블로그 글/진료 상세는 페이지별 `opengraph-image` 메타가 연결됨

---

## 주요 발견사항

### High

1. **SNS/외부 프로필 링크 부족**
   - `LINKS.kakaoChannel`, `LINKS.instagram`, `LINKS.naverBlog`가 빈 문자열
   - 현재 `sameAs`는 네이버 지도, 카카오맵, Google Business Profile, 네이버 플레이스 중심
   - 엔티티 그래프 확장 여지가 큼

2. **진료 상세 페이지에 `HowTo` 스키마 미렌더링**
   - [lib/jsonld.ts](/home/dev/projects/born2smile-website/lib/jsonld.ts:180)에 구현 존재
   - 하지만 실제 라우트에서 호출되지 않음
   - 진료 단계 콘텐츠가 있는 페이지에서는 적용 가치가 있음

3. **콘텐츠 출처/근거 링크 부족**
   - 의료 정보형 블로그와 FAQ는 구조가 좋지만, 공공기관/학회/가이드라인 인용이 적음
   - AI 인용성과 신뢰성 모두에서 손해

### Medium

4. **블로그 저자 신뢰 블록 부재**
   - 페이지 상단에 저자명과 직함은 노출되지만, 별도 저자 카드나 자격 요약 블록은 없음
   - E-E-A-T를 더 직접적으로 전달할 수 있음

5. **FAQ 답변 depth 확장 여지**
   - FAQ JSON-LD는 잘 되어 있으나, 일부 답변은 짧고 맥락이 적음
   - “언제/왜/어떻게/예외” 구조로 확장하면 AI 인용성이 높아짐

6. **리뷰 작성자 익명 처리**
   - Review JSON-LD의 author가 `○○○` 형식
   - 개인정보 보호 측면에서는 이해되지만, 신뢰 시그널은 약해질 수 있음

### Low

7. **일부 정적 페이지 `lastmod` 고정**
   - `sitemap.ts`의 일부 값은 실제 수정일 자동 추적이 아니라 수동 날짜
   - 치명적이진 않지만 운영 정합성 측면에서는 개선 가능

8. **`SpeakableSpecification` 사용**
   - 현재 블로그/진료 JSON-LD에 포함되어 있음
   - Google 기준 실효성이 낮아 우선순위는 낮음

---

## 카테고리별 평가

### 1. AI Citability

**좋은 점**

- 블로그 URL 구조가 명확함
- FAQ와 블로그 본문이 실제 HTML에 노출됨
- `llms.txt`가 존재하고 내용도 채워져 있음
- 블로그 글은 제목, 설명, 카테고리, 태그, 저자 엔티티를 JSON-LD로 제공

**개선점**

- 일부 콘텐츠는 설명형이지만 출처 기반 사실 블록이 부족
- FAQ와 진료 페이지에서 더 자기완결적인 답변 문장 확장이 가능

### 2. Brand Authority

**좋은 점**

- Google Business Profile, 네이버 플레이스, 네이버 지도, 카카오맵 연결 존재
- 사업자 정보와 병원 기본 정보가 명시적
- 리뷰와 로컬 엔티티 정보가 구조화 데이터에 포함됨

**개선점**

- SNS 및 외부 브랜드 채널이 비어 있음
- 외부 언급량은 이 문서만으로 단정할 수 없으므로 별도 웹 조사 필요

### 3. Content E-E-A-T

**좋은 점**

- 의료진 학력, 자격, 학회 활동, 현직 공개 수준이 높음
- `Physician` 엔티티와 `Dentist` 엔티티 연결이 잘 되어 있음
- 블로그 글 본문에 저자명과 직함이 실제 HTML에 노출됨

**개선점**

- 저자 카드, 출처 링크, 수치 기반 설명 보강 여지
- 리뷰 author 익명 처리로 사회적 증거가 약하게 보일 수 있음

### 4. Technical GEO

**좋은 점**

- `robots.txt` 정상
- `sitemap.xml` 정상
- canonical 정상
- RSS 정상
- SSR/SSG HTML 노출 양호

**개선점**

- `lastmod` 일부 수동 관리
- `llms.txt` 자체는 좋지만 Google 전용 신호로 과대평가하면 안 됨

### 5. Schema & Structured Data

**현재 확인된 스키마**

| 스키마 타입 | 상태 |
|---|---|
| `Dentist` + `MedicalBusiness` | 구현됨 |
| `Physician` | 구현됨 |
| `FAQPage` | 구현됨 |
| `BlogPosting` | 구현됨 |
| `CollectionPage` + `ItemList` | 구현됨 |
| `MedicalWebPage` | 구현됨 |
| `BreadcrumbList` | 구현됨 |
| `AggregateRating` + `Review` | 구현됨 |
| `HowTo` | 함수만 있고 미렌더링 |
| `WebSite` | 구현됨 |
| `SearchAction` | 구현 안 됨 |

**주의**

- 기존 초안에서 `WebSite + SearchAction`이 구현됐다고 적었지만, 실제 코드는 `WebSite`만 반환합니다.

### 6. Platform Optimization

**좋은 점**

- 네이버/Google 로컬 비즈니스 플랫폼 연결은 양호
- RSS와 structured data 조합이 좋음

**개선점**

- SNS, 블로그, 채널형 외부 접점 확장이 필요
- YouTube/커뮤니티 존재 여부는 외부 조사 없이는 단정 불가

---

## Quick Wins

1. **`HowTo` 스키마 활성화**
   - `/treatments/[slug]`에서 `getHowToJsonLd()` 렌더링

2. **SNS 링크 등록**
   - 인스타그램, 카카오 채널, 네이버 블로그 중 실제 운영 채널을 `LINKS`에 반영

3. **블로그/진료 콘텐츠에 출처 추가**
   - 건강보험, 치료기간, 적응증 같은 문장에 공식 기관 링크 추가

4. **저자 카드 추가**
   - 블로그 하단에 원장 자격 요약과 `/about` 링크 제공

5. **FAQ 답변 확장**
   - 짧은 답변 위주 항목을 2~4문장으로 보강

---

## 30일 액션 플랜

### 1주차

- [ ] `HowTo` 스키마 진료 상세에 연결
- [ ] SNS/채널 실제 운영 여부 확정 후 `LINKS` 반영
- [ ] 블로그 대표 글 5개에 출처 링크 추가

### 2주차

- [ ] 블로그 저자 카드 컴포넌트 추가
- [ ] FAQ 답변 확장
- [ ] 치료 페이지 수치/판단 기준 문장 정교화

### 3주차

- [ ] `lastmod` 관리 방식 개선 검토
- [ ] 리뷰 표시 정책 재검토
- [ ] Search Console 기반 실제 노출 변화 확인

### 4주차

- [ ] `SpeakableSpecification` 유지/제거 결정
- [ ] 외부 언급 및 로컬 플랫폼 존재감 별도 조사

---

## 신뢰도 메모

이 문서는 **현재 코드와 라이브 응답으로 검증 가능한 사실** 위주로 다시 작성했습니다. 아래 항목은 이 문서만으로 단정하지 않았습니다.

- 업계 내 “상위권” 여부
- Wikipedia/Wikidata 존재 여부
- 외부 언론/커뮤니티 언급량
- 특정 AI 검색엔진에서의 실제 노출 빈도

이런 항목은 별도의 웹 조사나 Search Console/분석 도구 검증이 필요합니다.

---

## 참고 검증 포인트

- 라이브 `llms.txt`: 내용 존재 확인
- 라이브 `sitemap.xml`: URL 112개 확인
- 라이브 블로그 글 HTML: 본문 텍스트 SSR 확인
- 코드 기준:
  - [lib/constants.ts](/home/dev/projects/born2smile-website/lib/constants.ts:301)
  - [lib/jsonld.ts](/home/dev/projects/born2smile-website/lib/jsonld.ts:180)
  - [lib/jsonld.ts](/home/dev/projects/born2smile-website/lib/jsonld.ts:404)

