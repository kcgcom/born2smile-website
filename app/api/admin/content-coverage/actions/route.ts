import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import { getActionWorkflowData, promoteActionToPlanner, saveActionReviewState } from "@/lib/content-coverage/action-workflow-store";
import { unauthorizedResponse, verifyAdminRequest } from "../../_lib/auth";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" } as const;
const reviewSchema = z.object({
  actionKey: z.string().min(3).max(300),
  assessmentInputVersion: z.string().min(10).max(100),
  status: z.enum(["pending", "completed"]),
  notes: z.string().max(1000),
});
const promoteSchema = z.object({
  actionKey: z.string().min(3).max(300),
  assessmentInputVersion: z.string().min(10).max(100),
});

function knownError(error: unknown) {
  if (!(error instanceof Error)) return null;
  const messages: Record<string, string> = {
    ACTION_NOT_FOUND: "현재 추천에서 해당 작업을 찾을 수 없습니다",
    ACTION_NOT_REVIEWABLE: "검토 상태를 기록할 수 없는 작업입니다",
    REVIEW_NOTES_REQUIRED: "검토 완료 시 판단 근거를 입력해 주세요",
    REVIEW_HAS_PROMOTED_DEPENDENCY: "이미 플래너로 전환된 후속 작업이 있어 검토를 다시 열 수 없습니다",
    ASSESSMENT_INPUT_STALE: "개념 판정이 변경되었습니다. 최신 추천을 불러온 뒤 다시 확인해 주세요",
    ACTION_NOT_PROMOTABLE: "콘텐츠 플래너로 전환할 수 없는 작업입니다",
    ACTION_BLOCKED: "선행 검토가 완료되지 않아 아직 전환할 수 없습니다",
    TOPIC_NOT_FOUND: "추천에 연결된 주제 명세를 찾을 수 없습니다",
  };
  return messages[error.message] ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  try {
    return Response.json({ data: await getActionWorkflowData() }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "콘텐츠 행동추천을 불러올 수 없습니다" }, { status: 500, headers: HEADERS });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR", message: "검토 상태가 올바르지 않습니다", issues: parsed.error.issues }, { status: 400, headers: HEADERS });
  try {
    const state = await saveActionReviewState(
      parsed.data.actionKey,
      { status: parsed.data.status, notes: parsed.data.notes },
      auth.email,
      parsed.data.assessmentInputVersion,
    );
    return Response.json({ data: state }, { headers: HEADERS });
  } catch (error) {
    const message = knownError(error);
    if (message) return Response.json({ error: "ACTION_ERROR", message }, { status: 400, headers: HEADERS });
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "검토 상태를 저장할 수 없습니다" }, { status: 500, headers: HEADERS });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = promoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR", message: "전환할 추천이 올바르지 않습니다", issues: parsed.error.issues }, { status: 400, headers: HEADERS });
  try {
    return Response.json({
      data: await promoteActionToPlanner(parsed.data.actionKey, auth.email, parsed.data.assessmentInputVersion),
    }, { status: 201, headers: HEADERS });
  } catch (error) {
    const message = knownError(error);
    if (message) return Response.json({ error: "ACTION_ERROR", message }, { status: 400, headers: HEADERS });
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "콘텐츠 플래너로 전환할 수 없습니다" }, { status: 500, headers: HEADERS });
  }
}
