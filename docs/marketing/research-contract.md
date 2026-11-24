# 리서치 결과 계약 v1 (설계)

향후 AI 리서치 센터 연동을 위한 문서 규격이다. 현재 DB/API/자동화 구현은 없다.
보고서는 schemaVersion=1, reportId, skillNames, generatedAt(KST 또는 offset 포함 ISO 8601), scope, period, sources, findings, limitations, recommendations, cost, reviewStatus를 포함한다.
- sources: 공개 URL 또는 비민감 내부 문서 경로, 자료 기준일, 조회일, 범위, 상태(ready/partial/unavailable).
- findings: 관찰 사실, 추론, 가설을 구분하고 sourceIds, 근거, 신뢰도 및 표본 한계를 기록한다.
- recommendations: 대상 경로, 우선순위, 근거, 완료 기준, 예상 효과(가설), 위험 및 승인 필요 여부.
- cost: 실제 호출 여부, 공급자, 확인된 비용 또는 unknown. 미확인 비용을 0으로 쓰지 않는다.
- reviewStatus: draft 또는 needs-review. 조사 보고서 자체는 공개 발행 권한을 부여하지 않는다.
- 반복 실행 설계 시 기간·대상·스킬·버전으로 중복 키를 정의하고 마지막 성공 시각, 부분 실패, 중단 조건, 사람 승인 지점을 명시한다.
- 개인 식별정보, 비밀키, 원시 리뷰/환자 기록은 저장하지 않는다. 기존 작업함에 제안 등록할 때는 agent-content-workflow.md의 승인·중복·버전 규칙을 적용한다.
