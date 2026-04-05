import { getSupabaseAdmin, isSupabaseAdminConfigured } from "./supabase-admin";
import { createAiSuggestion } from "./admin-ai-ops";
import type {
  AiOpsSuggestionJob,
  AiOpsSuggestionJobEvent,
  AiOpsSuggestionJobStage,
  AiOpsSuggestionJobStatus,
  AiOpsSuggestionType,
  AiOpsTargetType,
} from "./admin-ai-ops-types";

const JOBS_TABLE = "ai_agent_jobs";
const JOB_EVENTS_TABLE = "ai_agent_job_events";

interface SuggestionJobRow {
  id: number;
  job_type: "suggestion";
  target_type: AiOpsTargetType;
  target_id: string;
  suggestion_type: AiOpsSuggestionType;
  actor_email: string;
  context: string | null;
  payload_json: Record<string, unknown>;
  status: AiOpsSuggestionJobStatus;
  stage: AiOpsSuggestionJobStage;
  message: string;
  result_suggestion_id: number | null;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

interface SuggestionJobEventRow {
  id: number;
  job_id: number;
  status: AiOpsSuggestionJobStatus;
  stage: AiOpsSuggestionJobStage;
  message: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface CreateAiSuggestionJobInput {
  targetType: AiOpsTargetType;
  targetId: string;
  suggestionType: AiOpsSuggestionType;
  actorEmail: string;
  context?: string;
}

function mapSuggestionJobRow(row: SuggestionJobRow): AiOpsSuggestionJob {
  return {
    id: row.id,
    jobType: row.job_type,
    targetType: row.target_type,
    targetId: row.target_id,
    suggestionType: row.suggestion_type,
    actorEmail: row.actor_email,
    context: row.context,
    payloadJson: row.payload_json ?? {},
    status: row.status,
    stage: row.stage,
    message: row.message,
    resultSuggestionId: row.result_suggestion_id,
    lastError: row.last_error,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function mapSuggestionJobEventRow(row: SuggestionJobEventRow): AiOpsSuggestionJobEvent {
  return {
    id: row.id,
    jobId: row.job_id,
    status: row.status,
    stage: row.stage,
    message: row.message,
    metadataJson: row.metadata_json ?? {},
    createdAt: row.created_at,
  };
}

export function mapAiSuggestionJob(row: unknown) {
  return mapSuggestionJobRow(row as SuggestionJobRow);
}

export function mapAiSuggestionJobEvent(row: unknown) {
  return mapSuggestionJobEventRow(row as SuggestionJobEventRow);
}

export async function createAiSuggestionJob(input: CreateAiSuggestionJobInput): Promise<AiOpsSuggestionJob> {
  if (!isSupabaseAdminConfigured) {
    const now = new Date().toISOString();
    return {
      id: Date.now(),
      jobType: "suggestion",
      targetType: input.targetType,
      targetId: input.targetId,
      suggestionType: input.suggestionType,
      actorEmail: input.actorEmail,
      context: input.context?.trim() || null,
      payloadJson: {
        targetType: input.targetType,
        targetId: input.targetId,
        suggestionType: input.suggestionType,
        ...(input.context?.trim() ? { context: input.context.trim() } : {}),
      },
      status: "queued",
      stage: "queued",
      message: "제안 생성을 대기열에 등록했습니다.",
      resultSuggestionId: null,
      lastError: null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      updatedAt: now,
    };
  }

  const payloadJson = {
    targetType: input.targetType,
    targetId: input.targetId,
    suggestionType: input.suggestionType,
    ...(input.context?.trim() ? { context: input.context.trim() } : {}),
  };

  const { data, error } = await getSupabaseAdmin()
    .from(JOBS_TABLE)
    .insert({
      job_type: "suggestion",
      target_type: input.targetType,
      target_id: input.targetId,
      suggestion_type: input.suggestionType,
      actor_email: input.actorEmail,
      context: input.context?.trim() || null,
      payload_json: payloadJson,
      status: "queued",
      stage: "queued",
      message: "제안 생성을 대기열에 등록했습니다.",
    })
    .select("*")
    .single();

  if (error) throw error;

  const job = mapSuggestionJobRow(data as SuggestionJobRow);
  await appendAiSuggestionJobEvent(job.id, {
    status: "queued",
    stage: "queued",
    message: "제안 생성을 대기열에 등록했습니다.",
    metadataJson: {
      targetType: input.targetType,
      targetId: input.targetId,
      suggestionType: input.suggestionType,
    },
  });
  return job;
}

export async function appendAiSuggestionJobEvent(
  jobId: number,
  input: {
    status: AiOpsSuggestionJobStatus;
    stage: AiOpsSuggestionJobStage;
    message: string;
    metadataJson?: Record<string, unknown>;
  },
): Promise<AiOpsSuggestionJobEvent | null> {
  if (!isSupabaseAdminConfigured) return null;

  const { data, error } = await getSupabaseAdmin()
    .from(JOB_EVENTS_TABLE)
    .insert({
      job_id: jobId,
      status: input.status,
      stage: input.stage,
      message: input.message,
      metadata_json: input.metadataJson ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapSuggestionJobEventRow(data as SuggestionJobEventRow);
}

async function updateAiSuggestionJobState(
  jobId: number,
  input: {
    status: AiOpsSuggestionJobStatus;
    stage: AiOpsSuggestionJobStage;
    message: string;
    lastError?: string | null;
    resultSuggestionId?: number | null;
    startedAt?: string | null;
    completedAt?: string | null;
  },
) {
  if (!isSupabaseAdminConfigured) {
    return null;
  }

  const { data, error } = await getSupabaseAdmin()
    .from(JOBS_TABLE)
    .update({
      status: input.status,
      stage: input.stage,
      message: input.message,
      last_error: input.lastError ?? null,
      result_suggestion_id: input.resultSuggestionId ?? null,
      started_at: input.startedAt,
      completed_at: input.completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select("*")
    .single();

  if (error) throw error;
  return mapSuggestionJobRow(data as SuggestionJobRow);
}

export async function markAiSuggestionJobRunning(
  jobId: number,
  stage: Extract<AiOpsSuggestionJobStage, "context" | "generation" | "persisting">,
  message: string,
  metadataJson?: Record<string, unknown>,
) {
  const job = await updateAiSuggestionJobState(jobId, {
    status: "running",
    stage,
    message,
    ...(stage === "context" ? { startedAt: new Date().toISOString() } : {}),
  });
  await appendAiSuggestionJobEvent(jobId, {
    status: "running",
    stage,
    message,
    metadataJson,
  });
  return job;
}

export async function completeAiSuggestionJob(jobId: number, suggestionId: number, message = "운영 제안을 생성했습니다.") {
  const completedAt = new Date().toISOString();
  const job = await updateAiSuggestionJobState(jobId, {
    status: "completed",
    stage: "completed",
    message,
    resultSuggestionId: suggestionId,
    completedAt,
  });
  await appendAiSuggestionJobEvent(jobId, {
    status: "completed",
    stage: "completed",
    message,
    metadataJson: { suggestionId },
  });
  return job;
}

export async function failAiSuggestionJob(jobId: number, errorMessage: string) {
  const completedAt = new Date().toISOString();
  const message = errorMessage.trim() || "운영 제안 생성에 실패했습니다.";
  const job = await updateAiSuggestionJobState(jobId, {
    status: "failed",
    stage: "failed",
    message,
    lastError: message,
    completedAt,
  });
  await appendAiSuggestionJobEvent(jobId, {
    status: "failed",
    stage: "failed",
    message,
  });
  return job;
}

export async function processAiSuggestionJob(jobId: number, input: CreateAiSuggestionJobInput) {
  try {
    const suggestion = await createAiSuggestion(input, {
      onProgress: async ({ stage, message, metadata }) => {
        await markAiSuggestionJobRunning(jobId, stage, message, metadata);
      },
    });
    return await completeAiSuggestionJob(jobId, suggestion.id);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "운영 제안 생성 중 알 수 없는 오류가 발생했습니다";
    return failAiSuggestionJob(jobId, message);
  }
}
