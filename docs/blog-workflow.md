# 블로그 발행 워크플로우

## 초안 → 발행 예약 2단계 워크플로우

1. **초안 저장/수정**: BlogEditor에서 새 포스트 저장 시 `published: false` (초안) 상태로 Firestore에 저장. 이미 발행된 포스트 수정 시에는 `published: true` 상태 유지
2. **발행 예약**: BlogTab 포스트 목록에서 draft 포스트의 "발행" 버튼 클릭 → PublishPopup에서 스케줄 기반 추천 날짜 확인/변경 → "발행 예약" 클릭 시 `published: true` + 선택한 날짜로 업데이트. "오늘" 버튼으로 즉시 발행 가능 (오늘 날짜 선택 시 안내 메시지 표시)

## 발행 날짜 추천 로직 (`getNextPublishDate`)

1. `site-config/schedule`에서 발행 요일 목록 조회 (기본: 월/수/금 = `[1,3,5]`)
2. 이미 발행 예약된 포스트(`published: true` + 미래 날짜)의 날짜 수집
3. 오늘부터 90일 내에서 스케줄 요일에 해당하면서 아직 포스트가 없는 가장 빠른 날짜 추천

## 발행 후 노출 메커니즘

`published: true`이면서 `date <= today`인 포스트만 공개 사이트에 노출:

1. **클라이언트 필터링** (`BlogContent.tsx`): `date <= today` 조건으로 미발행 포스트 제외
2. **Sitemap 필터링** (`app/sitemap.ts`): 동일 조건으로 미발행 포스트 sitemap에서 제외

## 블로그 목록 표시 전략 (일별 시드 셔플)

- **SSR/CSR 동일 순서**: 날짜 기반 고정 시드 Fisher-Yates 셔플 (CLS 방지)
- **매일 다른 순서**: 오늘 날짜를 시드로 사용하여 하루 동안 동일한 순서 유지
- **페이지네이션**: Intersection Observer 기반 무한 스크롤, 12개씩 로드

## 블로그 포스트 콘텐츠 구조

각 포스트 파일은 `BlogPost` 인터페이스를 따르며, 본문은 `BlogPostSection[]` 배열:

```typescript
content: [
  { heading: "섹션 제목", content: "섹션 본문 텍스트" },
  { heading: "다음 섹션", content: "..." },
]
```

빌드 시 `generate-blog-meta.ts` 스크립트가 포스트 파일에서 메타데이터만 추출하고 `content` 필드는 제거하여 `posts-meta.ts`를 생성. 이를 통해 목록 페이지 번들에 본문이 포함되지 않아 번들 크기 최적화. `readTime`은 content 글자 수 기반으로 자동 계산 (한국어 분당 ~500자, 최소 1분, 올림 적용). 포스트 파일에 `readTime`을 수동 입력해도 빌드 시 자동 계산 값으로 덮어씌움.

## 블로그 작성 가이드라인

블로그 포스트 작성 시 `docs/blog-writing-guide.md` 참조 (브랜드 보이스, 문체 원칙, 글 구조, 섹션 전개, 전문 용어 통일표, SEO 검색 표현, 연결 표현).
