# 블로그 카드 노출·클릭 측정

2026-11-14. 로컬 구현, 운영 미배포. 기존 [읽기 측정](customer-analytics-measurement-contract.md)에 노출 기회와 선택 행동을 추가한다. 글의 자동 순위는 변경하지 않는다.

## 범위

- 전체 목록, 카테고리 질문 카드·상황별 카드·전체 글 목록.
- 상세 페이지 하단 자동 관련 글, 본문 안 수동 관련 글.
- 외부 참고문헌, 진료 페이지 링크, 태그·좋아요·공유 버튼은 글 카드 클릭에 포함하지 않는다.
- 관리자가 편집 중인 페이지와 수집 거부 브라우저는 공통 제외 정책을 따른다.

## 이벤트와 속성

| 이벤트 | 조건 |
|---|---|
| `blog_card_impression` | 문서가 visible이며 카드 면적 50% 이상이 viewport에 1초 연속 보임 |
| `blog_card_clicked` | 해당 카드에서 대상 글 링크를 클릭·키보드로 실행·가운데 버튼으로 열기 |

둘 다 PostHog 전용이며 GA4에 새 이벤트를 추가하지 않는다. 시각적 가림·독자의 시선까지 판별하는 측정은 아니다.

공통 속성:

- `card_measurement_version=blog_card_v1`
- `card_view_id`: 현재 페이지/목록 조건의 노출 기회 식별자
- `card_session_id`: SDK 세션 연결
- `card_key`: 화면 영역·그룹·위치·대상 글의 조합
- `target_slug`, `target_category`: 클릭 대상 글
- `source_path`: 카드를 본 페이지의 경로
- `surface`: listing / category_questions / category_curated / category_list / related_auto / related_manual
- `card_group`, `position`: 그룹 식별과 1부터 시작하는 표시 순번
- `has_search`, `category_filter`, `tag_filter`: 검색 여부와 정해진 필터 값

노출에는 `visible_ms=1000`, `visibility_threshold=0.5`를 붙인다. 클릭에는 `qualified_impression`을 붙여 그 클릭 전에 노출 기준을 충족했는지 구분한다.

검색어는 목록 조건 변경 판단을 위한 메모리 안에서만 사용하고 새 이벤트의 사용자 정의 속성에는 넣지 않는다. 새 카드 이벤트의 현재·referrer·세션 진입·최초 진입 URL에서 쿼리와 해시를 제외한다. SDK가 자동 속성을 붙인 후 `before_send`에서도 정리한다. 기존 자동 페이지뷰의 URL 정책을 변경한 작업은 아니다.

## 중복과 집계

같은 card_view_id + card_key에서 노출과 클릭은 각각 한 번만 기록한다. 아래로 갔다가 다시 올라와도 같은 카드를 중복 노출로 세지 않는다. 필터·검색 조건 변경, 다른 페이지 진입, SDK 세션 변경은 새 기회다. 단순 추가 로딩은 이미 본 카드의 노출을 다시 세지 않는다. StrictMode effect 재실행에도 제출 상태를 유지한다.

1초 전에 누른 클릭은 그대로 기록하고 `qualified_impression=false`로 남긴다. 클릭했다고 노출 이벤트를 강제로 만들지 않는다. 좋아요·공유·태그 버튼은 카드 선택으로 세지 않는다.

기본 클릭률은 같은 버전·기간·세션·card_view_id·card_key의 노출에 연결되고 `qualified_impression=true`인 고유 클릭 ÷ 고유 노출이다. 조건 미충족 클릭은 별도 횟수로 표시한다. 기간 경계에서 노출 없이 클릭만 들어온 경우도 클릭률에서 제외한다. 관련 글 개수가 많다고 대상 글 자체의 읽기 점수에 가산하지 않는다.

위치·영역별 클릭률을 우선 비교한다. 예를 들어 목록 첫 줄과 글 맨 아래의 노출을 섞어 우열을 판정하지 않는다. 적은 표본의 높은 클릭률도 곧바로 순위 변경에 사용하지 않는다.

PostHog에서 두 이벤트를 위 속성으로 집계할 수 있다. 관리자 화면의 별도 카드 클릭률 표와 자동 노출 조정은 아직 구현하지 않았다. 질문 해결 피드백과 검색 실패 측정도 다음 단계다.

## 제어와 구현 위치

- `NEXT_PUBLIC_BLOG_CARD_TRACKING_ENABLED=false`로 카드 측정만 중단한다. 미설정 시 활성, 변경 적용에는 재빌드가 필요하다.
- [트래커](../components/blog/BlogCardTracker.tsx): IntersectionObserver·노출 타이머·링크 클릭 위임·동적 카드 관찰. 타이머/관찰자는 페이지 해제 시 정리한다.
- [카드 표식](../lib/blog/card-tracking.ts): 정규 내부 글 링크 검증·위치 속성·면적 계산.
- [테스트](../tests/blog-reading.spec.ts): 실제 이벤트 payload를 가로채 운영 전송 없이 검증한다.

## 검증 결과

- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` 각각 성공.
- 읽기·카드 측정, 필터 URL, 목록 복귀, FAQ 관련 Playwright 29개 통과.
- 노출과 클릭 연결, 좋아요/공유 버튼 제외, 노출 전 빠른 클릭, 숨김 탭 제외, 재노출 중복 방지, SDK 자동 URL 속성의 검색어 제거를 검증했다.
- instrumentation-client 수정 직후 개발 HMR 모듈 캐시 오류가 발생했으며 서버 재시작 후 회귀 검사와 프로덕션 빌드가 통과했다.
- 커밋·배포·운영 테스트 이벤트 생성은 하지 않았다. 배포 후 실제 수집 확인은 남아 있다.
