export type AiOpsBriefingPeriod = "14d" | "30d" | "60d";
export type AiOpsBriefingPeriodType = "daily" | "weekly";
export type AiOpsTargetType = "post" | "page" | "site";
export type AiOpsSuggestionType = "title" | "meta_description" | "faq" | "internal_links" | "body_revision";
export type AiOpsSuggestionStatus = "draft" | "approved" | "rejected" | "applied";
export type AiOpsActionType = "approve" | "reject" | "apply" | "rollback" | "measure";
export type AiOpsSuggestionJobStatus = "queued" | "running" | "completed" | "failed";
export type AiOpsSuggestionJobStage = "queued" | "context" | "generation" | "persisting" | "completed" | "failed";
export type AiOpsObservationWindow = 14 | 30 | 60;
export type AiOpsSignalVerdict = "strong_positive" | "weak_positive" | "inconclusive" | "weak_negative" | "strong_negative";
export type AiOpsDifficulty = "low" | "medium" | "high";
export type AiOpsSignalState = "fresh" | "watch" | "cooldown" | "measuring";
export type AiOpsApplyMode = "auto" | "manual";
export type AiOpsPlaybookId =
  | "local-intent-refresh"
  | "faq-expansion"
  | "internal-link-cluster"
  | "snippet-refresh"
  | "stale-refresh";

export interface AiOpsMetricSnapshot {
  sessions: number | null;
  sessionsChange: number | null;
  clicks: number | null;
  clicksChange: number | null;
  impressions: number | null;
  impressionsChange: number | null;
  postsNeedingAttention: number;
  pagesNeedingAttention: number;
  tasksReadyToday: number;
  signalsPendingReview: number;
}

export interface AiOpsCandidateIssue {
  code: string;
  label: string;
  detail: string;
}

export interface AiOpsScoreFactor {
  label: string;
  score: number;
  detail: string;
}

export interface AiOpsObservationMetrics {
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  position: number | null;
  sessions: number | null;
  ctaClicks: number | null;
  phoneClicks: number | null;
  contactClicks: number | null;
  contactToPhoneRate: number | null;
}

export interface AiOpsEvidence {
  summary: string;
  scoreBreakdown: AiOpsScoreFactor[];
  topQueries: string[];
  metrics: AiOpsObservationMetrics;
  notes: string[];
}

export interface AiOpsObservationCheckpoint {
  windowDays: AiOpsObservationWindow;
  label: string;
  targetDate: string;
}

export interface AiOpsObservationPlan {
  status: "pending" | "active" | "ready";
  baseline: AiOpsObservationMetrics | null;
  checkpoints: AiOpsObservationCheckpoint[];
  latestVerdict?: AiOpsSignalVerdict | null;
  latestMeasuredAt?: string | null;
  confidenceNote?: string | null;
}

export interface AiOpsCandidate {
  id: string;
  targetType: AiOpsTargetType;
  targetId: string;
  title: string;
  subtitle?: string;
  suggestionTypes: AiOpsSuggestionType[];
  playbookIds: AiOpsPlaybookId[];
  priorityScore: number;
  primaryIssue: string;
  issues: AiOpsCandidateIssue[];
  difficulty: AiOpsDifficulty;
  signalState: AiOpsSignalState;
  evidence: AiOpsEvidence;
  stats?: {
    impressions?: number;
    ctr?: number;
    position?: number;
    clicks?: number;
    sessions?: number;
    ctaClicks?: number;
    publishedDate?: string;
    lastAppliedAt?: string | null;
  };
}

export interface AiOpsRecommendedAction {
  id: string;
  title: string;
  description: string;
  targetType: AiOpsTargetType;
  targetId: string;
  suggestionType?: AiOpsSuggestionType;
  playbookId?: AiOpsPlaybookId;
  priorityScore: number;
  difficulty: AiOpsDifficulty;
}

export interface AiOpsSignalItem {
  id: string;
  suggestionId: number | null;
  targetType: AiOpsTargetType;
  targetId: string;
  targetLabel: string;
  title: string;
  verdict: AiOpsSignalVerdict;
  windowDays: AiOpsObservationWindow;
  measuredAt: string;
  summary: string;
  confidenceNote: string;
  baseline: AiOpsObservationMetrics | null;
  observed: AiOpsObservationMetrics;
  delta: Partial<Record<keyof AiOpsObservationMetrics, number | null>>;
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
  todayTasks: AiOpsRecommendedAction[];
  contentDebtQueue: AiOpsCandidate[];
  searchOpportunityQueue: AiOpsCandidate[];
  pendingObservation: AiOpsSuggestedSignalPending[];
  recentSignals: AiOpsSignalItem[];
}

export interface AiOpsSuggestedSignalPending {
  id: string;
  suggestionId: number;
  targetType: AiOpsTargetType;
  targetId: string;
  targetLabel: string;
  title: string;
  nextCheckpoint: AiOpsObservationCheckpoint;
  daysRemaining: number;
  summary: string;
}

export interface AiOpsPlaybook {
  id: AiOpsPlaybookId;
  label: string;
  summary: string;
  description: string;
  targetTypes: Array<Exclude<AiOpsTargetType, "site">>;
  defaultSuggestionType: AiOpsSuggestionType;
  difficulty: AiOpsDifficulty;
  applyMode: AiOpsApplyMode;
  recommendedFor: string[];
  operatorPromptHint: string;
}

export interface AiOpsSuggestionRecord {
  id: number;
  targetType: AiOpsTargetType;
  targetId: string;
  suggestionType: AiOpsSuggestionType;
  playbookId: AiOpsPlaybookId | null;
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
  applyMode: AiOpsApplyMode;
  evidence: AiOpsEvidence | null;
  observationPlan: AiOpsObservationPlan | null;
}

export interface AiOpsSuggestionListItem extends AiOpsSuggestionRecord {
  targetLabel: string;
  canApply: boolean;
}

export interface AiOpsActivityItem {
  id: number;
  suggestionId: number | null;
  action: AiOpsActionType;
  actorEmail: string;
  note: string | null;
  createdAt: string;
  suggestionTitle: string;
  suggestionType: AiOpsSuggestionType | null;
  targetType: AiOpsTargetType;
  targetId: string;
  targetLabel: string;
  signalVerdict?: AiOpsSignalVerdict | null;
  signalWindowDays?: AiOpsObservationWindow | null;
}

export interface AiOpsTargetOption {
  id: string;
  label: string;
  targetType: Exclude<AiOpsTargetType, "site">;
  note?: string;
  priorityScore: number;
  difficulty: AiOpsDifficulty;
  signalState: AiOpsSignalState;
  cooldownUntil?: string | null;
  lastAppliedAt?: string | null;
  recommendedPlaybooks: AiOpsPlaybookId[];
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

export interface AiOpsOpportunityListResponse {
  opportunities: AiOpsCandidate[];
  playbooks: AiOpsPlaybook[];
}

export interface AiOpsOutcomesResponse {
  items: AiOpsSignalItem[];
  pending: AiOpsSuggestedSignalPending[];
}
