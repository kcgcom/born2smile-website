import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import { KEYWORD_CATEGORY_SLUGS } from "@/lib/admin-naver-datalab-keywords";
import {
  getKeywordCandidateBoundaryReviewData,
  saveKeywordCandidateBoundaryReviewEvaluation,
} from "@/lib/keyword-candidate-boundary-review-store";
import { unauthorizedResponse, verifyAdminRequest } from "../_lib/auth";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" } as const;
const updateSchema = z.object({
  id: z.string().min(1),
  relevance: z.enum(["relevant", "irrelevant", "uncertain"]),
  purpose: z.enum(["taxonomy", "content", "faq", "product", "local", "noise", "unknown"]),
  action: z.enum(["approve", "defer", "reject", "reclassify", "review"]),
  category: z.enum(KEYWORD_CATEGORY_SLUGS).nullable(),
  subgroup: z.string().max(100).nullable(),
  notes: z.string().max(1000),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  try {
    const review = await getKeywordCandidateBoundaryReviewData();
    const labeled = review.items.filter((item) => item.humanLabel != null).length;
    return Response.json({ data: {
      ...review,
      stats: { total: review.items.length, labeled, remaining: review.items.length - labeled },
    } }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "BOUNDARY_REVIEW_NOT_FOUND") {
      return Response.json({ error: "BOUNDARY_REVIEW_NOT_FOUND", message: "경계 검토 큐를 먼저 생성해 주세요." }, { status: 404, headers: HEADERS });
    }
    Sentry.captureException(error);
    return Response.json({ error: "BOUNDARY_REVIEW_LOAD_ERROR", message: "경계 검토 큐를 불러올 수 없습니다." }, { status: 500, headers: HEADERS });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", message: "검토 입력값이 올바르지 않습니다." }, { status: 400, headers: HEADERS });
  }
  try {
    const { id, ...input } = parsed.data;
    const humanLabel = await saveKeywordCandidateBoundaryReviewEvaluation(id, input, auth.email);
    return Response.json({ data: { id, humanLabel } }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "BOUNDARY_REVIEW_ITEM_NOT_FOUND") {
      return Response.json({ error: "BOUNDARY_REVIEW_ITEM_NOT_FOUND", message: "검토 항목을 찾을 수 없습니다." }, { status: 404, headers: HEADERS });
    }
    if (error instanceof Error && error.message === "BOUNDARY_REVIEW_PLACEMENT_INVALID") {
      return Response.json({ error: "BOUNDARY_REVIEW_PLACEMENT_INVALID", message: "분류 위치가 현재 택소노미와 맞지 않습니다." }, { status: 400, headers: HEADERS });
    }
    Sentry.captureException(error);
    return Response.json({ error: "BOUNDARY_REVIEW_SAVE_ERROR", message: "경계 사례 판단을 저장할 수 없습니다." }, { status: 500, headers: HEADERS });
  }
}
