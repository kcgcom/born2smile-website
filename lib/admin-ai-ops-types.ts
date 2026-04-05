export type AiOpsBriefingPeriod = "7d" | "28d";
export type AiOpsBriefingPeriodType = "daily" | "weekly";
export type AiOpsTargetType = "post" | "page" | "site";
export type AiOpsSuggestionType = "title" | "meta_description" | "faq" | "internal_links" | "body_revision";
export type AiOpsSuggestionStatus = "draft" | "approved" | "rejected" | "applied";
export type AiOpsActionType = "approve" | "reject" | "apply" | "rollback";
export type AiOpsSuggestionJobStatus = "queued" | "running" | "completed" | "failed";
export type AiOpsSuggestionJobStage = "queued" | "context" | "generation" | "persisting" | "completed" | "failed";

export interface AiOpsMetricSnapshot {
  sessions: number | null;
  sessionsChange: number | null;
  clicks: number | null;
  clicksChange: number | null;
  impressions: number | null;
  impressionsChange: number | null;
  postsNeedingAttention: number;
  pagesNeedingAttention: number;
}

export interface AiOpsCandidateIssue {
  code: string;
  label: string;
  detail: string;
}

export interface AiOpsCandidate {
  id: string;
  targetType: AiOpsTargetType;
  targetId: string;
  title: string;
  subtitle?: string;
  suggestionTypes: AiOpsSuggestionType[];
  priorityScore: number;
  primaryIssue: string;
  issues: AiOpsCandidateIssue[];
  stats?: {
    impressions?: number;
    ctr?: number;
    position?: number;
    clicks?: number;
    publishedDate?: string;
  };
}

export interface AiOpsRecommendedAction {
  id: string;
  title: string;
  description: string;
  targetType: AiOpsTargetType;
  targetId: string;
  suggestionType?: AiOpsSuggestionType;
  priorityScore: number;
}

export interface AiOpsBriefing {
  period: AiOpsBriefingPeriod;
  periodType: AiOpsBriefingPeriodType;
  generatedAt: string;
  headline: string;
  summary: string;
  metrics: AiOpsMetricSnapshot;
  recommendedActions: AiOpsRecommendedAction[];
  topCandidates: AiOpsCandidate[];
}

export interface AiOpsSuggestionRecord {
  id: number;
  targetType: AiOpsTargetType;
  targetId: string;
  suggestionType: AiOpsSuggestionType;
  title: string;
  beforeJson: Record<string, unknown>;
  afterJson: Record<string, unknown>;
  reason: string;
  priorityScore: number;
  status: AiOpsSuggestionStatus;
  createdAt: string;
  createdBy: string;
  approvedAt: string | null;
  approvedBy: string | null;
  appliedAt: string | null;
  appliedBy: string | null;
}

export interface AiOpsSuggestionListItem extends AiOpsSuggestionRecord {
  targetLabel: string;
  canApply: boolean;
}

export interface AiOpsActivityItem {
  id: number;
  suggestionId: number;
  action: AiOpsActionType;
  actorEmail: string;
  note: string | null;
  createdAt: string;
  suggestionTitle: string;
  suggestionType: AiOpsSuggestionType;
  targetType: AiOpsTargetType;
  targetId: string;
  targetLabel: string;
}

export interface AiOpsTargetOption {
  id: string;
  label: string;
  targetType: Exclude<AiOpsTargetType, "site">;
  note?: string;
}

export interface AiOpsSuggestionJob {
  id: number;
  jobType: "suggestion";
  targetType: AiOpsTargetType;
  targetId: string;
  suggestionType: AiOpsSuggestionType;
  actorEmail: string;
  context: string | null;
  payloadJson: Record<string, unknown>;
  status: AiOpsSuggestionJobStatus;
  stage: AiOpsSuggestionJobStage;
  message: string;
  resultSuggestionId: number | null;
  lastError: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface AiOpsSuggestionJobEvent {
  id: number;
  jobId: number;
  status: AiOpsSuggestionJobStatus;
  stage: AiOpsSuggestionJobStage;
  message: string;
  metadataJson: Record<string, unknown>;
  createdAt: string;
}
