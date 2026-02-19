# 블로그 리치 콘텐츠 (시각 콘텐츠) 추가 구현 계획

## 목표

현재 텍스트 전용인 블로그 포스트에 이미지를 추가할 수 있는 인프라를 구축한다.
기존 78개 포스트는 변경 없이 그대로 동작하고, 새 포스트부터 선택적으로 이미지를 포함할 수 있어야 한다.

## 변경 범위

### Step 1: 타입 시스템 확장 (`lib/blog/types.ts`)

`BlogPostSection`에 optional `image` 필드를 추가한다.

```typescript
/** 블로그 섹션에 포함할 이미지 */
export interface BlogPostImage {
  /** 이미지 경로 (public 기준, 예: "/images/blog/slug/filename.webp") */
  src: string;
  /** 접근성 + SEO용 대체 텍스트 (한국어) */
  alt: string;
  /** 이미지 아래 표시할 캡션 (선택) */
  caption?: string;
  /** next/image에 필요한 원본 너비 (px) */
  width: number;
  /** next/image에 필요한 원본 높이 (px) */
  height: number;
}

export interface BlogPostSection {
  heading: string;
  content: string;
  /** 섹션에 포함할 이미지 (선택) — heading 아래, content 위에 표시 */
  image?: BlogPostImage;
}
```

`BlogPostMeta`에 optional `thumbnail` 필드를 추가한다 (목록 카드용).

```typescript
export interface BlogPostMeta {
  // ... 기존 필드 유지
  /** 목록 카드에 표시할 대표 이미지 경로 (선택, 빌드 시 첫 번째 섹션 이미지에서 자동 추출) */
  thumbnail?: string;
}
```

**설계 근거:**
- `image`를 optional로 두어 기존 78개 포스트 무변경 호환
- `heading` 아래, `content` 위 배치가 시각적으로 자연스러움 (제목 읽고 → 이미지 보고 → 본문 읽기)
- `width`/`height`를 필수로 두어 `next/image` CLS 방지
- 멀티 이미지(갤러리)는 현 단계에서는 과도 → 섹션당 1이미지로 시작

### Step 2: 블로그 상세 페이지 렌더링 (`app/blog/[slug]/page.tsx`)

본문 섹션 루프에서 `section.image`가 있으면 `next/image`로 렌더링한다.

```tsx
{post.content.map((section) => (
  <div key={section.heading}>
    <h2 className="font-headline mb-4 text-xl font-bold text-gray-900 md:text-2xl">
      {section.heading}
    </h2>

    {section.image && (
      <figure className="my-6">
        <Image
          src={section.image.src}
          alt={section.image.alt}
          width={section.image.width}
          height={section.image.height}
          sizes="(min-width: 768px) 720px, 100vw"
          className="w-full rounded-xl"
        />
        {section.image.caption && (
          <figcaption className="mt-2 text-center text-sm text-gray-500">
            {section.image.caption}
          </figcaption>
        )}
      </figure>
    )}

    <p className="text-base leading-relaxed text-gray-700 md:text-lg">
      {section.content}
    </p>
  </div>
))}
```

- `<figure>` + `<figcaption>` 시멘틱 HTML 사용
- `rounded-xl`로 사이트 디자인 언어와 통일
- `sizes` 속성으로 반응형 최적화 (max-w-3xl 컨테이너 = ~720px)

### Step 3: 메타데이터 생성 스크립트 수정 (`scripts/generate-blog-meta.ts`)

1. 첫 번째 섹션 이미지를 `thumbnail`으로 자동 추출
2. 이미지 열람 시간을 readTime 계산에 반영 (이미지당 +12초 ≈ 0.2분)
3. 이미지 경로 존재 여부 경고 (빌드 시 누락 감지)

```typescript
// thumbnail 자동 추출
const firstImage = content.find((s) => s.image)?.image;
if (firstImage) {
  meta.thumbnail = firstImage.src;
}

// readTime에 이미지 열람 시간 반영
const imageCount = content.filter((s) => s.image).length;
const calculatedMinutes = Math.max(
  1,
  Math.ceil(totalChars / CHARS_PER_MINUTE + imageCount * 0.2)
);

// 이미지 경로 유효성 검사 (경고만, 빌드 실패 아님)
for (const section of content) {
  if (section.image) {
    const imgPath = path.resolve(__dirname, `../public${section.image.src}`);
    if (!fs.existsSync(imgPath)) {
      console.warn(`⚠ ${file}: 이미지 파일 없음 → ${section.image.src}`);
    }
  }
}
```

### Step 4: 블로그 목록 카드에 썸네일 표시 (`components/blog/BlogContent.tsx`)

`thumbnail`이 있는 포스트는 카드 상단에 이미지를 표시한다.

```tsx
<article className="group flex h-full flex-col rounded-2xl border ...">
  {/* 썸네일 (있는 경우만) */}
  {post.thumbnail && (
    <div className="relative mb-4 aspect-[3/2] w-full overflow-hidden rounded-xl">
      <Image
        src={post.thumbnail}
        alt=""
        fill
        sizes="(min-width: 1024px) 368px, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform group-hover:scale-105"
      />
    </div>
  )}
  {/* 기존 카테고리 + 공유 + 제목 + 본문 ... */}
</article>
```

- `aspect-[3/2]`로 일관된 카드 비율
- `fill` + `object-cover`로 다양한 이미지 크기 대응
- `alt=""`로 장식적 이미지 처리 (제목이 이미 정보 전달)
- 썸네일 없는 기존 포스트는 현재와 동일하게 텍스트 카드

### Step 5: JSON-LD 구조화 데이터 강화 (`lib/jsonld.ts`)

`getBlogPostJsonLd()`에서 포스트 이미지가 있으면 `image` 필드를 포스트별 이미지로 교체.

```typescript
export function getBlogPostJsonLd(post: BlogPost) {
  // 포스트에 포함된 이미지 수집
  const postImages = post.content
    .filter((s) => s.image)
    .map((s) => ({
      "@type": "ImageObject" as const,
      url: `${BASE_URL}${s.image!.src}`,
      width: s.image!.width,
      height: s.image!.height,
    }));

  return {
    // ... 기존 필드 유지
    image: postImages.length > 0
      ? postImages
      : { "@type": "ImageObject", url: `${BASE_URL}/opengraph-image`, width: 1200, height: 630 },
  };
}
```

### Step 6: OG 이미지 개선 (`app/blog/[slug]/page.tsx` - `generateMetadata`)

포스트에 이미지가 있으면 첫 번째 이미지를 OG 이미지로 사용한다.

```typescript
// generateMetadata 내부
const firstImage = post.content.find((s) => s.image)?.image;
const ogImage = firstImage
  ? { url: firstImage.src, width: firstImage.width, height: firstImage.height, alt: firstImage.alt }
  : { url: "/images/og-image.jpg", width: 1200, height: 630, alt: CLINIC.name };
```

### Step 7: 이미지 디렉토리 구조 생성

```
public/images/blog/
└── (포스트 slug별 디렉토리는 이미지 추가 시 개별 생성)
```

기본 디렉토리만 생성하고, 개별 포스트 이미지는 포스트 작성 시 추가.

### Step 8: CLAUDE.md 블로그 작성 가이드라인에 이미지 가이드 추가

- 이미지 포맷: WebP 권장 (JPEG 허용), 600~800px 너비
- 파일명: kebab-case 설명적 이름 (예: `osseointegration-process.webp`)
- 경로 규칙: `/images/blog/{slug}/{filename}.webp`
- 캡션: 1줄 이내, 이미지가 전달하는 핵심 정보 요약
- alt 텍스트: 한국어, 검색 키워드 포함, 이미지 내용을 구체적으로 기술
- 권장 사용처: 단계별 도해, 비교 다이어그램, 구조 설명 일러스트
- 비권장: 장식용 스톡 사진, 워터마크 이미지, 텍스트 과다 이미지

## 변경하지 않는 것

- 기존 78개 포스트 파일 — 모두 무변경 (image 필드 없으면 기존과 동일 동작)
- `lib/blog/index.ts` — re-export/매핑 로직 변경 없음
- `lib/blog/category-colors.ts` — 변경 없음
- `app/blog/page.tsx` — 변경 없음 (BlogContent 컴포넌트에 위임)
- Firebase/Firestore 관련 — 변경 없음

## 파일별 변경 요약

| 파일 | 변경 내용 |
|------|----------|
| `lib/blog/types.ts` | `BlogPostImage` 인터페이스 추가, `BlogPostSection.image` 추가, `BlogPostMeta.thumbnail` 추가 |
| `app/blog/[slug]/page.tsx` | Image import 추가, 섹션 렌더링에 이미지 로직 추가, OG 이미지 개선 |
| `scripts/generate-blog-meta.ts` | thumbnail 추출, readTime 이미지 반영, 경로 검증 경고 |
| `components/blog/BlogContent.tsx` | next/image import, 카드에 썸네일 렌더링 추가 |
| `lib/jsonld.ts` | `getBlogPostJsonLd()` image 필드 동적 생성 |
| `public/images/blog/` | 디렉토리 생성 (빈 상태) |
| `CLAUDE.md` | 블로그 이미지 가이드라인 섹션 추가 |
