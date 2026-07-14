import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import {
  listContentReevaluationStates,
  retryContentReevaluation,
  saveContentReevaluationReviewEntry,
} from "@/lib/content-coverage/reevaluation-store";
import { COVERAGE_TOPIC_SPECS } from "@/lib/content-coverage/topic-specs";
import { unauthorizedResponse, verifyAdminRequest } from "../../_lib/auth";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" } as const;
const supportLabel = z.enum(["supports", "partial", "not-supported"]);
const reviewSchema = z.object({
  actionKey: z.string().min(3).max(300),
  id: z.string().min(1).max(500),
  topicReviewLabel: z.enum(["relevant", "partial", "irrelevant"]),
  conceptLabels: z.record(z.string(), supportLabel),
  notes: z.string().max(1000),
});
const retrySchema = z.object({ actionKey: z.string().min(3).max(300), action: z.literal("retry") });

function knownError(error: unknown) {
  if (!(error instanceof Error)) return null;
  const messages: Record<string, string> = {
    REEVALUATION_NOT_FOUND: "재평가 요청을 찾을 수 없습니다",
    REEVALUATION_NOT_REVIEWABLE: "현재 검토할 수 없는 재평가 요청입니다",
    REEVALUATION_ITEM_NOT_FOUND: "재평가 후보를 찾을 수 없습니다",
    REEVALUATION_LABEL_MISMATCH: "판정해야 할 개념과 저장 값이 일치하지 않습니다",
    REEVALUATION_NOT_FAILED: "실패 상태의 재평가만 다시 요청할 수 있습니다",
  };
  return messages[error.message] ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  try {
    const states = await listContentReevaluationStates();
    return Response.json({ data: {
      states,
      topics: COVERAGE_TOPIC_SPECS.map((spec) => ({
        id: spec.id,
        label: spec.label,
        concepts: spec.concepts.map((concept) => ({ id: concept.id, label: concept.label, description: concept.description })),
      })),
      stats: {
        total: states.length,
        pending: states.filter((state) => state.status === "pending-evidence-refresh" || state.status === "processing").length,
        needsReview: states.filter((state) => state.status === "needs-review").length,
        completed: states.filter((state) => state.status === "completed").length,
        failed: states.filter((state) => state.status === "failed").length,
      },
    } }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "콘텐츠 재평가 목록을 불러올 수 없습니다" }, { status: 500, headers: HEADERS });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR", message: "재평가 판정 값이 올바르지 않습니다", issues: parsed.error.issues }, { status: 400, headers: HEADERS });
  try {
    const { actionKey, id, ...input } = parsed.data;
    return Response.json({ data: await saveContentReevaluationReviewEntry(actionKey, id, input, auth.email) }, { headers: HEADERS });
  } catch (error) {
    const message = knownError(error);
    if (message) return Response.json({ error: "REEVALUATION_ERROR", message }, { status: 400, headers: HEADERS });
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "재평가 판정을 저장할 수 없습니다" }, { status: 500, headers: HEADERS });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = retrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR", message: "재시도 요청이 올바르지 않습니다", issues: parsed.error.issues }, { status: 400, headers: HEADERS });
  try {
    return Response.json({ data: await retryContentReevaluation(parsed.data.actionKey) }, { headers: HEADERS });
  } catch (error) {
    const message = knownError(error);
    if (message) return Response.json({ error: "REEVALUATION_ERROR", message }, { status: 400, headers: HEADERS });
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "재평가를 다시 요청할 수 없습니다" }, { status: 500, headers: HEADERS });
  }
}
