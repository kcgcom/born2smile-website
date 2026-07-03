import type {
  AiOpsRecommendedAction,
  AiOpsSuggestionJob,
  AiOpsSuggestionJobEvent,
  AiOpsSuggestionListItem,
} from "@/lib/admin-ai-ops-types";

export const JOB_STAGE_SEQUENCE: AiOpsSuggestionJob["stage"][] = ["queued", "context", "generation", "persisting", "completed"];

export type WorkflowMode = "recommended" | "manual";

export interface RecommendedExecutionItem {
  id: string;
  title: string;
  description: string;
  targetType: "post" | "page";
  targetId: string;
  playbookId?: string | null;
  priorityScore: number;
  source: "today" | "candidate";
}

export function targetTypeLabel(value: AiOpsRecommendedAction["targetType"]) {
  switch (value) {
    case "post":
      return "블로그";
    case "page":
      return "페이지";
    default:
      return "사이트";
  }
}

export function statusLabel(status: AiOpsSuggestionListItem["status"]) {
  switch (status) {
    case "draft":
      return "초안";
    case "approved":
      return "승인됨";
    case "applied":
      return "반영됨";
    default:
      return "반려됨";
  }
}

export function stageLabel(stage: AiOpsSuggestionJob["stage"]) {
  switch (stage) {
    case "queued":
      return "대기";
    case "context":
      return "문맥 수집";
    case "generation":
      return "초안 생성";
    case "persisting":
      return "저장";
    case "completed":
      return "완료";
    default:
      return stage;
  }
}

export function defaultStageMessage(stage: AiOpsSuggestionJob["stage"]) {
  switch (stage) {
    case "queued":
      return "작업 큐에 등록되어 실행을 기다립니다.";
    case "context":
      return "대상 정보와 추천 기준을 수집하고 있습니다.";
    case "generation":
      return "AI가 초안 내용을 만들고 있습니다.";
    case "persisting":
      return "생성된 초안을 저장하고 후속 검토를 준비합니다.";
    case "completed":
      return "초안 생성이 끝났습니다.";
    default:
      return "";
  }
}

export type StepState = "done" | "current" | "pending" | "failed";

export function stepStateLabel(state: StepState) {
  switch (state) {
    case "done":
      return "완료";
    case "current":
      return "진행 중";
    case "failed":
      return "실패";
    default:
      return "대기";
  }
}

export function stepTone(state: StepState) {
  switch (state) {
    case "done":
      return "bg-emerald-100 text-emerald-700";
    case "current":
      return "bg-blue-100 text-blue-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-400";
  }
}

export function stepBadgeTone(state: StepState) {
  switch (state) {
    case "done":
      return "bg-emerald-100 text-emerald-700";
    case "current":
      return "bg-blue-100 text-blue-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

export function stepConnectorTone(state: StepState) {
  switch (state) {
    case "done":
      return "bg-emerald-300";
    case "current":
      return "bg-blue-300";
    case "failed":
      return "bg-red-300";
    default:
      return "bg-slate-200";
  }
}

export interface ProgressStep {
  stage: AiOpsSuggestionJob["stage"];
  label: string;
  state: StepState;
  message?: string;
}

export function buildJobProgressSteps(job: AiOpsSuggestionJob | null, events: AiOpsSuggestionJobEvent[]): ProgressStep[] {
  const latestEventByStage = new Map<AiOpsSuggestionJob["stage"], AiOpsSuggestionJobEvent>();
  for (const event of events) {
    latestEventByStage.set(event.stage, event);
  }

  const currentIndex = job ? JOB_STAGE_SEQUENCE.indexOf(job.stage) : -1;
  return JOB_STAGE_SEQUENCE.map((stage, index) => {
    const latestEvent = latestEventByStage.get(stage);
    let state: StepState = "pending";

    if (job?.status === "failed" && stage === job.stage) {
      state = "failed";
    } else if (job?.status === "completed" || (currentIndex > index && currentIndex >= 0)) {
      state = "done";
    } else if (job && stage === job.stage) {
      state = "current";
    }

    return {
      stage,
      label: stageLabel(stage),
      state,
      message: latestEvent?.message ?? (job?.stage === stage ? job.message : undefined),
    };
  });
}

export function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
