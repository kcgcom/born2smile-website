# 관리자 화면 컴포넌트

- API 호출은 `useAdminApi.ts`의 SWR 기반 조회·변경 헬퍼와 기존 인증 헤더 처리를 우선 재사용한다. 응답·오류 형식은 해당 API와 함께 확인한다.
- `TrafficTab.tsx`, `SearchTab.tsx`, `IndexingStatusTab.tsx`, `ConversionTab.tsx`는 분석 화면이다. `traffic/`, `search/`에서 세부 뷰와 차트를 관리한다.
- 포스트 목록·편집·이미지는 `blog/`, 콘텐츠 계획은 `planner/`, 전략·택소노미·검토 화면은 `insight/`, 설정 폼은 `settings/`에 있다.
- `GrowthOverviewPanel.tsx`는 운영 개요, `ContentScheduleManager.tsx`는 발행 일정, `ProjectTab.tsx`와 `ReferenceTab.tsx`는 개발도구 화면이다.
- 공통 폼·저장 버튼은 `shared/`, 로딩·오류는 `AdminLoadingSkeleton.tsx`와 `AdminErrorState.tsx`를 재사용한다.
- 차트의 동적 import와 로딩 처리를 유지한다. 순수 타입·헬퍼 파일까지 일괄적으로 use client로 만들지 않는다.
- 편집 시 임시저장 복구·저장 전 검증·실패 표시·성공 후 캐시 갱신을 보존한다. 서버 검증을 클라이언트 검증으로 대체하지 않는다.
- 기간 필터·카테고리·키워드·선택 행 상태를 바꿀 때 데이터 조회 키와 상세 드릴다운이 일치하는지 확인한다.
