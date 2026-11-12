# FAQ

- `page.tsx`는 서버 컴포넌트로 `lib/treatments.ts`의 FAQ를 모아 표시한다.
- 질문·답변은 TREATMENT_DETAILS에서 수정한다. 페이지의 진료 순서와 `lib/constants.ts`의 진료 목록도 확인한다.
- 각 문항은 네이티브 details/summary를 사용한다. 키보드 조작·포커스 표시·진료 안내 링크를 유지한다.
- 화면과 FAQPage JSON-LD는 같은 질문·답변을 사용해야 한다. 별도의 복제된 FAQ 데이터를 만들지 않는다.
