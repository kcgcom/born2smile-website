# 공개 블로그 라우트

- 데이터 저장·스냅샷·카테고리 규칙은 `lib/blog/AGENTS.md`, 작성·발행은 `docs/blog-writing-guide.md`와 `docs/blog-workflow.md`를 따른다.
- `page.tsx`는 전체 목록, `[category]/page.tsx`는 허브, `[category]/[slug]/page.tsx`는 본문이다.
- 공개 조회는 `lib/blog-supabase.ts`를 거쳐 발행 상태와 KST 날짜를 적용한다. 관리자 초안을 공개 목록에 섞지 않는다.
- slug·카테고리 불일치와 레거시 URL은 기존 redirect/notFound 처리를 보존한다. `redirect/[slug]/page.tsx` 및 `next.config.ts`와 함께 확인한다.
- 목록의 필터 URL·스크롤 복귀는 `components/blog/listNavigation.ts`, `BlogContent.tsx`, `BlogListReturnLink.tsx`와 관련 tests를 확인한다.
- 본문 편집은 `InlineBlogEditButton`, 본문 렌더링은 `BlogPostRenderer` 및 블록 컴포넌트로 이어진다. 공개 표시와 관리자 편집 경계를 유지한다.
- 메타데이터·OG 이미지·JSON-LD·관련 글·연구 링크의 URL과 날짜를 일치시킨다. 본문·카테고리 변경 시 `lib/blog/dates.ts`, `lib/blog/category-hubs/`도 확인한다.
