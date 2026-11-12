# 진료 안내

- 목록은 `page.tsx`, 상세는 `[slug]/page.tsx`에서 렌더링한다. 진료 목록은 `lib/constants.ts`, 상세 설명·단계·FAQ는 `lib/treatments.ts`를 확인한다.
- 진료 추가 시 목록·상세 데이터·정적 params·관련 진료·블로그 카테고리 연결을 함께 확인한다.
- 진료 ID와 블로그 slug는 같다고 가정하지 않는다. 예: scaling 진료는 prevention 카테고리에 연결된다.
- metadata·OG 이미지·JSON-LD는 해당 상세 라우트와 `lib/jsonld.ts`가 기준이다. 사용하지 않는 HowTo 스키마를 임의로 다시 추가하지 않는다.
- FAQ는 네이티브 details/summary를 유지한다. `app/faq/page.tsx`에서 같은 데이터를 사용한다.
- 관련 글은 공개 블로그 조회·URL 헬퍼를 사용하고 발행 상태를 우회하지 않는다.
