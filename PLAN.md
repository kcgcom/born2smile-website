# 블로그 개선 계획

## 현재 문제점 분석

### CRITICAL (블로그가 작동하지 않는 핵심 원인)

1. **개별 블로그 포스트 페이지 없음** — `app/blog/[slug]/page.tsx`가 존재하지 않음
   - 공유 버튼이 `/blog/correct-brushing-method` 등의 URL을 생성하지만, 해당 경로 접근 시 **404 에러** 발생
   - 블로그 허브에서 개별 포스트로 이동할 수 없음

2. **블로그 포스트 본문 콘텐츠 없음** — `BlogPost` 인터페이스에 `excerpt`(요약)만 있고 `content`(본문) 필드가 없음
   - 전체 글을 읽을 수 있는 방법이 없음

### HIGH (SEO/검색엔진 최적화 문제)

3. **개별 포스트 사이트맵 미등록** — `app/sitemap.ts`에 `/blog` 허브만 등록, 10개 개별 포스트 URL 미포함
4. **블로그 JSON-LD 스키마 없음** — `lib/jsonld.ts`에 BlogPosting 스키마 생성 함수 없음 → 검색결과 리치 스니펫 불가

### MEDIUM (UX/사용성 문제)

5. **블로그 카드에 클릭 링크 없음** — 카드를 클릭해도 상세 페이지로 이동 불가 (경로 자체가 없으므로)
6. **관련 포스트 추천 없음** — 같은 카테고리 글 연결 기능 없음

---

## 개선 계획 (구현 순서)

### Step 1: 블로그 포스트 본문 콘텐츠 추가 (`lib/blog-posts.ts`)

- `BlogPost` 인터페이스에 `content` 필드 추가 (구조화된 섹션 배열)
- 기존 10개 포스트에 본문 콘텐츠 작성
- 콘텐츠 구조: 서론 → 본문 섹션(소제목 + 내용) → 결론 → CTA(내원 안내)
- 치과 전문성을 반영한 정확한 의료 정보 + 이해하기 쉬운 설명

```typescript
export interface BlogPostSection {
  heading: string;
  content: string;
}

export interface BlogPost {
  id: number;
  slug: string;
  category: "구강관리" | "예방치료" | "치아상식" | "생활습관";
  title: string;
  excerpt: string;
  content: BlogPostSection[];  // 신규 추가
  date: string;
  readTime: string;
}
```

**수정 파일:** `lib/blog-posts.ts`

### Step 2: 개별 블로그 포스트 페이지 생성 (`app/blog/[slug]/page.tsx`)

- `generateStaticParams()`로 10개 슬러그 정적 생성
- `generateMetadata()`로 포스트별 SEO 메타데이터 동적 생성
- 포스트 상세 페이지 UI:
  - Breadcrumb 네비게이션 (홈 > 블로그 > 포스트명)
  - 카테고리 배지 + 날짜 + 읽기 시간
  - 포스트 제목 (h1, font-headline)
  - 본문 콘텐츠 렌더링 (섹션별 h2 + p)
  - 공유 버튼
  - 관련 포스트 추천 (같은 카테고리, 최대 3개)
  - "목록으로 돌아가기" 링크
  - JSON-LD 구조화 데이터 (BlogPosting)
  - Breadcrumb JSON-LD

**생성 파일:** `app/blog/[slug]/page.tsx`

### Step 3: BlogContent 컴포넌트에 포스트 링크 추가 (`components/blog/BlogContent.tsx`)

- 각 블로그 카드를 `<Link href={/blog/${slug}}>` 로 연결
- "자세히 읽기" 버튼 또는 카드 전체 클릭 가능하게
- 카드 hover 시 시각적 피드백

**수정 파일:** `components/blog/BlogContent.tsx`

### Step 4: 블로그 JSON-LD 스키마 추가 (`lib/jsonld.ts`)

- `getBlogPostJsonLd(post)` 함수 추가
  - `@type: "BlogPosting"` 스키마
  - `headline`, `description`, `datePublished`, `author`, `publisher` 포함

**수정 파일:** `lib/jsonld.ts`

### Step 5: 사이트맵에 개별 포스트 URL 추가 (`app/sitemap.ts`)

- `BLOG_POSTS`에서 각 포스트의 slug를 읽어 개별 URL 생성
- `changeFrequency: "monthly"`, `priority: 0.5`

**수정 파일:** `app/sitemap.ts`

### Step 6: 빌드 확인 및 린트

- `pnpm lint` 실행하여 ESLint 오류 없는지 확인
- `pnpm build` 실행하여 빌드 성공 확인
- 정적 생성된 블로그 포스트 페이지 확인

---

## 블로그 상세 페이지 레이아웃

```
┌─────────────────────────────────────┐
│ Breadcrumb: 홈 > 블로그 > 포스트명    │
├─────────────────────────────────────┤
│ 카테고리 배지  ·  날짜  ·  읽기시간    │
│                                     │
│ 포스트 제목 (h1, font-headline)      │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ 본문 섹션 1                          │
│   소제목 (h2)                        │
│   내용 (p)                           │
│                                     │
│ 본문 섹션 2                          │
│   소제목 (h2)                        │
│   내용 (p)                           │
│                                     │
│ ... (반복)                           │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ 공유 버튼  │  목록으로 돌아가기         │
│                                     │
├─────────────────────────────────────┤
│ 관련 포스트 (같은 카테고리, 최대 3개)   │
│ ┌────┐ ┌────┐ ┌────┐               │
│ │카드│ │카드│ │카드│               │
│ └────┘ └────┘ └────┘               │
└─────────────────────────────────────┘
```

## 디자인 원칙

- 기존 사이트 디자인 시스템 준수 (블루+골드 듀얼 컬러)
- `FadeIn`, `StaggerContainer`, `StaggerItem` 애니메이션 활용
- `section-padding`, `container-narrow` 유틸리티 클래스 사용
- `font-headline` 서체로 제목 강조
- 반응형 레이아웃 (모바일 우선)
