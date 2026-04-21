# 블로그 발행 워크플로우

## 1. 초안 저장 → 발행 2단계

블로그 운영은 `/admin?tab=content&sub=posts`를 기준으로 진행합니다.

1. **초안 저장/수정**
   - `BlogEditor`에서 새 글을 저장하면 `published: false` 상태로 Supabase `blog_posts`에 저장됩니다.
   - 이미 발행된 글을 수정할 때는 기존 `published` 상태를 유지합니다.
2. **발행 실행**
   - 포스트 목록에서 `발행`을 누르면 `PublishPopup`이 열립니다.
   - 발행 방식은 세 가지입니다.
     - `스케줄에 맞춰 발행`: 저장된 발행 요일 정책 기준 추천 날짜 사용
     - `즉시 발행`: 오늘 날짜로 바로 공개
     - `날짜 직접 선택`: 원하는 날짜 직접 입력

## 2. 추천 날짜 계산 (`getNextPublishDate`)

추천 날짜는 아래 순서로 계산합니다.

1. `site_config.schedule.publishDays` 조회 (기본값: 월/수/금 = `[1, 3, 5]`)
2. `published: true`이면서 오늘 이상 날짜를 가진 포스트의 예약 날짜 수집
3. 오늘부터 90일 안에서:
   - 발행 요일에 해당하고
   - 아직 다른 포스트가 예약되지 않은
   가장 빠른 날짜를 추천
4. 후보가 없으면 다음 날을 fallback으로 사용

발행 요일 정책은 `/admin?tab=content&sub=schedule`에서 수정합니다.

## 3. 공개 노출 조건

공개 사이트에는 아래 조건을 만족하는 글만 노출됩니다.

- `published === true`
- `date <= today(KST)`

이 조건은 다음 경로에서 함께 사용됩니다.

- 블로그 목록/카테고리 허브
- 개별 포스트 정적 생성
- `app/sitemap.ts`
- `app/feed.xml`
- 예약 발행 재검증(`/api/cron/rebuild`)

## 4. 예약 발행 자동화

`vercel.json`의 Cron이 매일 KST 00:05에 `/api/cron/rebuild`를 호출합니다.

이 라우트는 다음 작업을 수행합니다.

1. `/blog`와 `/sitemap.xml` 재검증
2. 오늘 공개 대상 포스트의 카테고리/상세 경로 재검증
3. `INDEXNOW_KEY`가 설정된 경우 변경 URL을 IndexNow에 제출

## 5. 콘텐츠 구조

블로그 포스트의 Single Source of Truth는 Supabase `blog_posts`입니다.

본문은 `blocks` 단일 포맷으로 관리합니다.

- `heading`
- `paragraph`
- `list`
- `faq`
- `relatedLinks`
- `table`

## 6. 빌드/폴백 전략

- `pnpm dev`, `pnpm build` 시 `generate-blog-snapshot.ts`가 snapshot 생성
- 이어서 `generate-blog-meta.ts`가 목록용 메타데이터 생성
- `pnpm dev`, `pnpm build`의 공개 블로그 렌더링은 방금 생성한 snapshot을 기준으로 동작
- 런타임 공개 블로그 조회는 Supabase 우선이며, 조회 실패 시 snapshot으로 폴백

## 7. 관련 문서

- 작성 기준: `docs/blog-writing-guide.md`
- 데이터 구조/폴백: `docs/supabase-architecture.md`
