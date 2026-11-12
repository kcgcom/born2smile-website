# 블로그 발행 워크플로우

## 작성과 저장

- 목록: `/admin/content/posts`, 새 글: `/admin/content/posts/new`, 편집: `/admin/content/posts/{slug}`.
- 새 글은 초안으로 저장하고, 발행된 글의 본문 수정은 발행 상태와 구분한다. 실제 폼은 `BlogEditorScreen`·`useBlogEditorForm`, 저장 계약은 관리자 blog-posts API가 기준이다.
- 공개 글의 인라인 편집도 같은 서버 인증·입력 검증을 거친다. 콘텐츠 수정은 사용자에게 내용을 검토받는 기존 운영 절차를 따른다.

## 발행과 예약

`PublishPopup`과 `hooks/usePublishPopup.ts`에서 스케줄 추천·즉시 발행·날짜 직접 선택을 처리한다. 발행 요일은 `/admin/content/schedule`에서 관리한다.

추천 로직은 `lib/publish-schedule.ts`에서 KST 달력 날짜와 기존 예약을 기준으로 계산한다. 인라인 편집·관리자 목록·편집 화면이 같은 계산을 사용한다. 조회 실패·설정 누락·90일 내 빈 날짜 없음은 임의의 다음 날로 대체하지 않고 추천을 비우고 오류를 표시한다. 이 경우 다시 시도하거나 즉시 발행·날짜 직접 선택을 사용한다.

공개 여부는 `published === true`와 `date <= today(KST)`를 함께 적용한다. 예약은 미래 날짜와 발행 상태로 저장되며, 날짜 도래 시 cron이 published 값을 바꾸는 구조가 아니다.

## 공개 반영과 캐시

- 저장 후 블로그 캐시 갱신은 `app/api/admin/_lib/blog-cache.ts`의 `revalidateBlogCaches`가 처리한다. 목록·사이트맵·상세·카테고리·이전 카테고리의 영향을 함께 고려한다.
- `vercel.json`의 블로그 cron은 KST 00:05에 `/api/cron/rebuild`를 호출한다. CRON_SECRET 인증 후 당일 발행된 글을 조회하고 캐시를 재검증한다.
- INDEXNOW_KEY가 설정되면 당일 글과 관련 URL을 IndexNow에 제출한다. 제출은 검색엔진의 수집·색인을 보장하지 않는다.
- 이 cron은 새 Vercel 배포를 만들지 않는다. 새 빌드와 캐시 재검증은 별도 작업이다.
- RSS는 `app/feed.xml/route.ts`, 사이트맵은 `app/sitemap.ts`에서 공개 조회 결과를 사용한다.

## 본문 데이터와 출처

원본은 Supabase `blog_posts`다. 앱의 `blocks`는 DB의 `content`에 매핑한다. 현재 블록 형식은 `lib/blog/types.ts`, 검증은 `lib/blog-validation.ts`, 표시·편집은 해당 블록 렌더러가 기준이다. 이미지·표·인용·연구 자료 연결도 지원하므로 일부 블록만 고정 목록으로 복제하지 않는다.

- [작성 가이드](blog-writing-guide.md)
- [출처 링크 정책](source-link-policy.md)
- [카테고리 허브 관리](../lib/blog/category-hubs/README.md)

## 빌드와 장애 폴백

1. `pnpm generate-blog-snapshot`은 Supabase에서 본문과 발행 상태를 가져온다.
2. `pnpm generate-blog-meta`는 그 스냅샷에서 메타데이터를 추출한다.
3. dev/build는 두 단계를 실행하고 `BLOG_PUBLIC_DATA_SOURCE=snapshot`으로 공개 데이터를 읽는다.
4. 해당 환경값이 없는 기본 런타임 조회는 Supabase 우선, 실패 시 마지막 스냅샷으로 폴백한다. 실제 배포의 환경값도 확인한다.
5. 빌드는 `BLOG_SNAPSHOT_REQUIRED=true`이므로 최신 스냅샷 조회 실패를 무시하지 않는다.

수동 원고 디렉터리는 사용하지 않는다. 스냅샷은 마지막 생성 시점의 데이터이며 DB·Storage 전체 백업을 대체하지 않는다. 자세한 구조는 [Supabase 아키텍처](supabase-architecture.md)를 참고한다.
