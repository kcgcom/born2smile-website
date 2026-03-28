# GEO Audit Report: 서울본치과

**감사 날짜:** 2026-03-27
**URL:** https://www.born2smile.co.kr
**비즈니스 유형:** Local Medical Business (치과의원)
**분석 페이지:** 14개 (홈, /about, /treatments/implant, /faq, /blog, 7개 카테고리 허브, robots.txt, llms.txt, sitemap.xml)

---

## Executive Summary

**종합 GEO 점수: 68/100 (Fair)**

이전 감사(2026-03-27 이전) 대비 **getDoctorJsonLd(), getWebSiteJsonLd(), speakable, BlogPosting author @id** 등 다수 항목이 구현되어 기술 GEO 기반은 탄탄해졌습니다. 남은 핵심 병목은 **Clinic 스키마 @id 미선언**(엔티티 그래프 단절), **의사 사진 스키마 누락**, **Google Business Profile URL sameAs 미연결**, **SNS 채널 전무**입니다.

### 점수 상세

| 카테고리 | 점수 | 가중치 | 가중 점수 |
|---|---|---|---|
| AI Citability | 74/100 | 25% | 18.5 |
| Brand Authority | 52/100 | 20% | 10.4 |
| Content E-E-A-T | 80/100 | 20% | 16.0 |
| Technical GEO | 85/100 | 15% | 12.75 |
| Schema & Structured Data | 65/100 | 10% | 6.5 |
| Platform Optimization | 38/100 | 10% | 3.8 |
| **종합 GEO 점수** | | | **68/100** |

---

## 이전 감사 이후 해결된 항목 ✅

| 항목 | 구현 위치 |
|---|---|
| Physician 독립 스키마 (getDoctorJsonLd) | `lib/jsonld.ts:358` |
| WebSite + publisher @id (getWebSiteJsonLd) | `lib/jsonld.ts:395` |
| BlogPosting speakable cssSelector | `lib/jsonld.ts:239` |
| BlogPosting author @id + url | `lib/jsonld.ts:233` |
| FAQPage 스키마 (치료 페이지 + /faq) | `lib/jsonld.ts:201` |
| BreadcrumbList | `lib/jsonld.ts:339` |
| CollectionPage (블로그 목록/카테고리) | `lib/jsonld.ts:271, 297` |
| 개인정보처리방침 페이지 | `app/privacy/` (미커밋) |
| AI 크롤러 명시적 허용 (robots.ts) | GPTBot, ClaudeBot, PerplexityBot 등 9종 |
| llms.txt 기본 구조 | 진료과목, 의료진, 연락처, FAQ 링크 |
| IndexNow 구현 | `scripts/submit-indexnow.mjs` |

---

## High Priority Issues

### H1. Clinic JSON-LD `@id` 미선언 — 엔티티 그래프 단절 ⚠️ 신규
**파일:** `lib/jsonld.ts` — `getClinicJsonLd()` (line 23)

`getWebSiteJsonLd()`의 `publisher`(line 404)와 `getDoctorJsonLd()`의 `worksFor`(line 369)가 모두 `"@id": "${BASE_URL}/#organization"`을 참조하지만, **Clinic 스키마 자체에 이 @id가 없어** 엔티티 그래프가 연결되지 않습니다.

```typescript
// getClinicJsonLd() 반환 객체 최상단에 추가
"@id": `${BASE_URL}/#organization`,
```

---

### H2. Physician 스키마에 의사 사진 누락 ⚠️ 신규
**파일:** `lib/jsonld.ts` — `getDoctorJsonLd()` (line 358)

`DOCTORS[0].image = "/images/doctors/kim-changgyun.jpg"`가 constants.ts에 정의되어 있으나 Physician 스키마에 `image` 프로퍼티 없음. AI 엔티티 인식 핵심 신호.

```typescript
// getDoctorJsonLd() 반환 객체에 추가
image: `${BASE_URL}${doctor.image}`,
```

---

### H3. `sameAs`에 Google Business Profile URL 없음 ⚠️ 신규
**파일:** `lib/constants.ts` LINKS (line 236), `lib/jsonld.ts` line 105

현재 sameAs: `["https://naver.me/IMy2FmsZ", "https://kko.to/nVk0hY6cH8"]` (단축 URL 2개뿐).
**Google Place ID는 알려진 상태** (`ChIJv6ztq7eGfDURXB0HJQ3ZpQg`) — GBP canonical URL을 sameAs에 추가하면 지식 패널 연결에 직접 기여.

```typescript
// lib/constants.ts LINKS에 추가
googleBusiness: "https://www.google.com/maps/place/?q=place_id:ChIJv6ztq7eGfDURXB0HJQ3ZpQg",
naverPlace: "https://m.place.naver.com/hospital/698879488",
```

---

### H4. HowTo 스키마 — 2023년 9월 Google 지원 종료 (잔존 중)
**파일:** `lib/jsonld.ts` (line 175), `app/treatments/[slug]/page.tsx`

2023년 9월 Google이 HowTo 리치 결과를 완전 제거했으나 여전히 6개 진료 페이지에 삽입됨. 페이지 무게만 증가.

**수정:** `app/treatments/[slug]/page.tsx`에서 `getHowToJsonLd()` 호출 및 `<script>` 삽입 제거. 함수 자체는 유지해도 무방.

---

### H5. SNS 채널 전무 — 브랜드 권위도 병목
**파일:** `lib/constants.ts` (line 238-240)

`kakaoChannel`, `instagram`, `naverBlog` 모두 빈 문자열. AI 모델의 브랜드 인식은 다중 플랫폼 존재에 비례. 현재 외부 신호: Naver Map + Kakao Map 2개.

**최소 액션:** 네이버 플레이스 프로필 완성(무료) → URL을 `LINKS.naverPlace`로 추가. 중기적으로 네이버 블로그 or 인스타그램 중 하나 운영 시작.

---

## Medium Priority Issues

### M1. sitemap.ts `PAGE_MODIFIED` 날짜 미갱신
**파일:** `app/sitemap.ts` (line 9-15)

홈·about·treatments 모두 `2026-02-20` 하드코딩. 최근 커밋(2026-03-25)에서 블로그 카테고리 허브 등 다수 페이지가 변경됐으나 미반영. 검색엔진 재크롤링 지연 가능.

```typescript
// 수정 예시
home: new Date("2026-03-27"),
blog: new Date("2026-03-27"),
```

---

### M2. llms.txt에 블로그 포스트 수·개별 글 링크 미포함
**파일:** `public/llms.txt`

현재: `/blog` 단일 링크만. 76개 글이 있음을 명시하고 카테고리별 허브 링크 + 대표 포스트 5~7개를 직접 링크하면 AI citability 즉시 향상.

```markdown
## 건강칼럼 (76개 글)
- [임플란트](https://www.born2smile.co.kr/blog/implant)
- [치아교정](https://www.born2smile.co.kr/blog/orthodontics)
- [보철치료](https://www.born2smile.co.kr/blog/prosthetics)
- [소아치료](https://www.born2smile.co.kr/blog/pediatric)
- [보존치료](https://www.born2smile.co.kr/blog/restorative)
- [예방관리](https://www.born2smile.co.kr/blog/prevention)
- [건강상식](https://www.born2smile.co.kr/blog/health-tips)
```

---

### M3. speakable cssSelector `.blog-post-excerpt` 클래스 DOM 적용 확인 필요
**파일:** `lib/jsonld.ts` (line 239-241)

`cssSelector: ["h1", ".blog-post-excerpt", "article > p:first-of-type"]` — `.blog-post-excerpt`가 실제 렌더링 HTML에 없으면 speakable 선언이 무효. 블로그 포스트 컴포넌트에서 excerpt 요소에 해당 클래스 실제 적용 여부 확인 필요.

---

### M4. sameAs에 단축 URL 사용 (기존 항목)
**파일:** `lib/constants.ts` LINKS (line 241-242)

`naver.me/...`, `kko.to/...`는 리다이렉트 단축 URL. Google은 canonical URL을 선호.

```typescript
naverMap: "https://m.place.naver.com/hospital/698879488",
kakaoMap: "https://map.kakao.com/link/map/서울본치과,37.xxx,126.xxx", // 좌표 기반
```

---

### M5. 블로그 포스트 이미지 모두 동일한 OG 이미지
**파일:** `lib/jsonld.ts` — `getBlogPostJsonLd()` (line 251)

76개 포스트 전부 `og-image.jpg` 동일 이미지. Google Discover 노출·AI 이미지 인덱싱 불리.

**단기 해결:** 카테고리별 대표 이미지 분기 (`switch(post.category)`).

---

### M6. `/contact` 페이지 JSON-LD 없음
Contact 페이지에 `ContactPage` 스키마 미적용. 로컬 비즈니스 상담 경로 구조화에 기여.

```typescript
// lib/jsonld.ts에 추가
export function getContactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `상담 안내 | ${CLINIC.name}`,
    url: `${BASE_URL}/contact`,
    mainEntity: {
      "@type": "Dentist",
      "@id": `${BASE_URL}/#organization`,
      telephone: CLINIC.phoneIntl,
    },
  };
}
```

---

## Low Priority Issues

### L1. `areaServed` 확장 가능
현재: 김포시, 한강신도시, 장기동, 우편번호. 운양동·마산동·구래동·통진 추가 시 인근 지역 AI 검색 인용 가능성 상승.

### L2. Organization `foundingDate` 누락
`getClinicJsonLd()`에 설립일 추가 시 비즈니스 신뢰도·오래됨 신호 강화.

### L3. Blog `keywords`에 지역 키워드 미포함
현재 `keywords: post.tags` (예: `"치료후관리"`). "김포", "한강신도시" 추가 권장.

### L4. FAQ 동일 내용 중복 선언
`/faq`, 진료 페이지, 홈 모두 동일 FAQPage JSON-LD. `/faq`를 canonical source로 두고 타 페이지 스키마 축소 고려.

### L5. `robots.ts`에 OAI-SearchBot 미포함
ChatGPT 웹 검색 전용 크롤러 `OAI-SearchBot`을 AI 허용 목록에 추가.

---

## Quick Wins (이번 주, 코드 변경 최소)

| 순서 | 작업 | 파일 | 예상 임팩트 |
|---|---|---|---|
| 1 | Clinic JSON-LD `"@id"` 1줄 추가 | `lib/jsonld.ts:26` | 엔티티 그래프 즉시 복구 |
| 2 | Doctor JSON-LD `image` 추가 | `lib/jsonld.ts:358` | AI 의사 엔티티 인식 |
| 3 | `LINKS.googleBusiness` + `naverPlace` 추가 | `lib/constants.ts` | sameAs 3→5개, GBP 연결 |
| 4 | sitemap `PAGE_MODIFIED` 날짜 최신화 | `app/sitemap.ts` | 크롤러 우선순위 반영 |
| 5 | llms.txt 블로그 카테고리 7개 링크 추가 | `public/llms.txt` | AI citability 즉시 향상 |
| 6 | `getHowToJsonLd()` 호출 제거 | `app/treatments/[slug]/page.tsx` | deprecated 스키마 정리 |

---

## 30일 실행 계획

### Week 1: 스키마 엔티티 정비
- [ ] Clinic JSON-LD `@id` 추가 (`getClinicJsonLd`)
- [ ] Doctor JSON-LD `image` 추가 (`getDoctorJsonLd`)
- [ ] `LINKS`에 `googleBusiness`, `naverPlace` 입력
- [ ] sitemap `PAGE_MODIFIED` 날짜 최신화
- [ ] HowTo 스키마 호출 제거
- [ ] `robots.ts`에 `OAI-SearchBot` 추가

### Week 2: llms.txt + ContactPage
- [ ] llms.txt 블로그 카테고리 7개 링크 + 대표 포스트 추가
- [ ] `getContactPageJsonLd()` 구현 및 `/contact` 적용
- [ ] speakable `.blog-post-excerpt` 클래스 DOM 적용 확인

### Week 3: 브랜드 권위도
- [ ] 네이버 플레이스 프로필 완성 (사진, 진료시간, 소개 텍스트)
- [ ] Google Business Profile 완성 (카테고리: 치과의원, 사진, 예약 링크)
- [ ] sameAs 단축 URL → canonical URL 교체

### Week 4: 콘텐츠 citability 고도화
- [ ] Blog `keywords`에 "김포", "한강신도시" 추가
- [ ] Organization `foundingDate` 추가
- [ ] 카테고리별 OG 이미지 분기 (블로그 이미지 다양화 1단계)
- [ ] 블로그 대표 포스트에 권위 출처 링크 추가 (건강보험심사평가원 등)

---

## 분석 페이지 목록

| URL | 상태 | 주요 이슈 |
|---|---|---|
| / | ⚠️ | Clinic @id 없음, PAGE_MODIFIED 미갱신 |
| /about | ⚠️ | Doctor image 스키마 누락 |
| /treatments/implant | ⚠️ | HowTo deprecated 잔존 |
| /faq | ✅ | — |
| /blog | ✅ | — |
| /blog/[category] ×7 | ✅ | — |
| /contact | ⚠️ | ContactPage 스키마 없음 |
| /privacy | ✅ | 생성됨 (미커밋) |
| robots.txt | ✅ | OAI-SearchBot 미포함 (Low) |
| llms.txt | ⚠️ | 블로그 카테고리 링크 없음 |
| sitemap.xml | ⚠️ | 정적 페이지 lastmod 고정 |
