---
name: dental-analytics
description: 서울본치과의 GA4·Search Console·네이버·PostHog 데이터와 고객 행동 지표를 조회하거나 해석할 때 사용한다.
---

# 서울본치과 성과 분석

- 글별 검색·유입·행동은 [관리자 글 성과](../../../docs/admin-post-performance.md), 페이지 단위 자료 수집은 [agent:context 사용법](../../../docs/agent-content-workflow.md)을 참고한다. 제공된 집계나 저장 결과로 답할 수 있으면 그대로 사용한다. `--offline` 결과는 연결·출력 확인용이며 운영 성과 조회를 대체하지 않는다.
- 읽기·반응·문의의 기간과 분모는 [고객 행동 측정 계약](../../../docs/customer-analytics-measurement-contract.md), 카드 클릭률은 [카드 측정 기준](../../../docs/customer-analytics-card-measurement.md)을 따른다.
- 전화는 [전화 이벤트 목록](../../../lib/analytics-events.ts)을 기준으로 한다. 운영 개요의 클릭 이벤트 건수와 고유 클릭 세션 수를 구분한다. 세션 기준 비율에는 같은 집계 범위의 세션 분모를 쓰며, 전화 클릭에서 통화나 예약 완료를 확인할 수 없다.
