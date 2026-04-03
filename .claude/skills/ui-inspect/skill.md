---
name: ui-inspect
description: born2smile 웹사이트 UI/디자인 전체 점검을 에이전트 팀으로 실행하는 오케스트레이터. "UI 점검", "디자인 점검", "접근성 감사", "반응형 확인", "컴포넌트 리뷰" 등을 요청하면 이 스킬을 사용한다. ui-inspector, a11y-auditor, design-consistency 팀을 구성하여 병렬 점검 후 종합 리포트를 생성한다.
---

# UI Inspect Orchestrator

born2smile 웹사이트의 UI/디자인 전체 점검을 에이전트 팀으로 실행한다.

## 실행 모드: 에이전트 팀 (팬아웃/팬인)

## 에이전트 구성

| 팀원 | 역할 | 스킬 | 출력 |
|------|------|------|------|
| ui-inspector | 페이지별 레이아웃·반응형·컴포넌트 점검 | `ui-page-scan` | `_workspace/ui-inspector-report.md` |
| a11y-auditor | WCAG 2.1 AA 접근성 점검 | `a11y-check` | `_workspace/a11y-report.md` |
| design-consistency | 디자인 토큰·브랜드 일관성 점검 | `design-token-audit` | `_workspace/design-consistency-report.md` |

## 워크플로우

### Phase 1: 준비
1. `_workspace/` 디렉토리 생성 (프로젝트 루트 기준)
2. 점검 범위 확인 — 인자로 특정 페이지/컴포넌트 지정 시 해당 범위만, 없으면 전체

### Phase 2: 팀 구성 및 병렬 점검

```
TeamCreate(
  team_name: "ui-inspect-team",
  members: [
    {
      name: "ui-inspector",
      agent_file: ".claude/agents/ui-inspector.md",
      model: "opus",
      prompt: "ui-page-scan 스킬을 사용해 born2smile 웹사이트 전체 페이지 UI를 점검하라.
               점검 후 _workspace/ui-inspector-report.md에 저장하고,
               리더(leader)에게 완료 메시지와 critical 이슈 요약을 SendMessage로 전달하라."
    },
    {
      name: "a11y-auditor",
      agent_file: ".claude/agents/a11y-auditor.md",
      model: "opus",
      prompt: "a11y-check 스킬을 사용해 WCAG 2.1 AA 기준으로 접근성을 점검하라.
               특히 Header skip link, FaqAccordion ARIA, LikeButton 레이블, contact 폼을 우선 점검.
               _workspace/a11y-report.md에 저장 후 리더에게 SendMessage로 완료 보고하라."
    },
    {
      name: "design-consistency",
      agent_file: ".claude/agents/design-consistency.md",
      model: "opus",
      prompt: "design-token-audit 스킬을 사용해 globals.css 토큰 준수 여부를 점검하라.
               하드코딩된 색상/간격, 브랜드 이탈, 폰트 오용을 발굴하라.
               _workspace/design-consistency-report.md에 저장 후 리더에게 SendMessage로 완료 보고하라."
    }
  ]
)
```

```
TaskCreate(tasks: [
  { title: "UI 페이지 점검", assignee: "ui-inspector" },
  { title: "접근성 점검", assignee: "a11y-auditor" },
  { title: "디자인 일관성 점검", assignee: "design-consistency" },
  { title: "종합 리포트 생성", assignee: "leader", depends_on: ["UI 페이지 점검", "접근성 점검", "디자인 일관성 점검"] }
])
```

### Phase 3: 팀원 완료 대기 및 종합

3명 모두 완료 보고 수신 후:

1. 3개 리포트 읽기
2. `_workspace/ui-inspect-final-report.md` 생성:

```markdown
# UI/디자인 점검 종합 리포트
생성일: YYYY-MM-DD

## 📊 전체 요약

| 영역 | 🔴 critical | 🟡 major | 🟢 minor |
|------|------------|---------|---------|
| UI/레이아웃 | N | N | N |
| 접근성 | N | N | N |
| 디자인 일관성 | N | N | N |
| **합계** | **N** | **N** | **N** |

## 🚨 즉시 수정 필요 (critical)
[3개 리포트의 critical 이슈 통합, 중복 제거]

## ⚠️ 개선 권장 (major)
[major 이슈 요약]

## 세부 리포트
- UI/레이아웃: `_workspace/ui-inspector-report.md`
- 접근성: `_workspace/a11y-report.md`
- 디자인 일관성: `_workspace/design-consistency-report.md`
```

3. 사용자에게 최종 리포트 경로와 critical 이슈 수 요약 출력
4. 팀 정리

## 에러 핸들링

- 팀원이 1시간 내 완료 보고 없을 경우: 해당 에이전트 결과 없이 진행, 리포트에 누락 명시
- 파일 읽기 실패: 빈 리포트 생성하지 말고 에러 원인 리포트에 기록

## 테스트 시나리오

**정상 흐름:**
"UI 점검 해줘" → 팀 3명 병렬 실행 → 각 리포트 생성 → 종합 리포트 출력

**에러 흐름:**
a11y-auditor가 globals.css를 못 찾을 경우 → 색 대비 계산 건너뛰고 구조적 문제만 리포트 → 누락 명시
