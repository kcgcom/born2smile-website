# 블로그 컴포넌트

- `BlogContent.tsx`는 목록 필터·검색·추가 로딩·셔플을 관리한다. URL 상태와 목록 복귀는 `listNavigation.ts`, `BlogListReturnLink.tsx`와 함께 변경한다.
- `BlogPostRenderer.tsx`는 블록별 표시를 담당한다. 새 블록은 `lib/blog/types.ts`, 정규화·검증, 관리자 편집기와 함께 지원한다.
- `BlogEditProvider.tsx`, `InlineBlocksEditor.tsx`는 인라인 편집 상태와 본문 편집을 제공한다. 공개 렌더링에 편집 전용 의존성을 불필요하게 추가하지 않는다.
- `BlogCitations.tsx`, `CitationFields.tsx`와 `lib/blog/citations.ts`의 인용·출처 연결을 보존한다. 출처 정책은 `docs/source-link-policy.md`를 따른다.
- `TableOfContents.tsx`의 heading ID·스크롤 관찰·모바일 동작은 본문 렌더러와 일치해야 한다.
- 질문 해결 피드백은 `QuestionFeedback.tsx`와 공개 저장 API에서 처리한다. 관리자는 저장하지 않으며 브라우저에서 DB에 직접 쓰지 않는다. 실패 시 성공 응답처럼 표시하지 않는다.
- 공유 버튼과 방문 추적은 `BlogShareButton.tsx`, `BlogShareVisitTracker.tsx`를 함께 확인한다.
- `tests/`의 blog 관련 spec으로 목록 복귀·필터·본문·인용·저장 동작 중 변경한 부분을 검증한다.
