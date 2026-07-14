import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import { KEYWORD_CATEGORY_SLUGS } from "@/lib/admin-naver-datalab-keywords";
import {
  confirmKeywordCandidateShadowAuditPreReviews,
  getKeywordCandidateShadowAuditData,
  saveKeywordCandidateShadowAuditEvaluation,
} from "@/lib/keyword-candidate-shadow-audit-store";
import { unauthorizedResponse, verifyAdminRequest } from "../_lib/auth";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" } as const;
const confirmSchema = z.object({ action: z.literal("confirm-pre-reviews") });
const updateSchema = z.object({
  id: z.string().min(1),
  relevance: z.enum(["relevant", "irrelevant", "uncertain"]),
  purpose: z.enum(["taxonomy", "content", "faq", "product", "local", "noise", "unknown"]),
  action: z.enum(["approve", "defer", "reject", "reclassify", "review"]),
  category: z.enum(KEYWORD_CATEGORY_SLUGS).nullable(),
  subgroup: z.string().trim().min(1).max(30).nullable(),
  notes: z.string().trim().max(1000),
}).superRefine((value, context) => {
  if ((value.category == null) !== (value.subgroup == null)) {
    context.addIssue({ code: "custom", message: "카테고리와 서브그룹은 함께 선택해야 합니다.", path: ["category"] });
  }
  if (value.purpose === "taxonomy" && (!value.category || !value.subgroup)) {
    context.addIssue({ code: "custom", message: "택소노미 목적은 분류 위치가 필요합니다.", path: ["subgroup"] });
  }
});

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  try {
    const audit = await getKeywordCandidateShadowAuditData();
    const labeled = audit.items.filter((item) => item.humanLabel != null).length;
    const preReviewed = audit.items.filter((item) => item.preReview != null).length;
    return Response.json({ data: {
      ...audit,
      stats: { total: audit.items.length, labeled, remaining: audit.items.length - labeled, preReviewed },
    } }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "SHADOW_AUDIT_NOT_FOUND") {
      return Response.json({
        error: "SHADOW_AUDIT_NOT_FOUND",
        message: "독립 감사 큐가 아직 생성되지 않았습니다.",
      }, { status: 404, headers: HEADERS });
    }
    Sentry.captureException(error);
    return Response.json({ error: "SHADOW_AUDIT_READ_ERROR", message: "독립 감사 큐를 불러올 수 없습니다." }, { status: 500, headers: HEADERS });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "평가 값이 올바르지 않습니다." }, { status: 400, headers: HEADERS });
  }
  try {
    const { id, ...input } = parsed.data;
    const humanLabel = await saveKeywordCandidateShadowAuditEvaluation(id, input, auth.email);
    return Response.json({ data: { id, humanLabel } }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "SHADOW_AUDIT_ITEM_NOT_FOUND") {
      return Response.json({ error: "NOT_FOUND", message: "감사 항목을 찾을 수 없습니다." }, { status: 404, headers: HEADERS });
    }
    if (error instanceof Error && error.message === "SHADOW_AUDIT_PLACEMENT_INVALID") {
      return Response.json({ error: "PLACEMENT_INVALID", message: "유효한 분류 위치를 선택해 주세요." }, { status: 400, headers: HEADERS });
    }
    Sentry.captureException(error);
    return Response.json({ error: "SHADOW_AUDIT_SAVE_ERROR", message: "독립 감사 판단을 저장할 수 없습니다." }, { status: 500, headers: HEADERS });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = confirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", message: "일괄 확정 요청이 올바르지 않습니다." }, { status: 400, headers: HEADERS });
  }
  try {
    const result = await confirmKeywordCandidateShadowAuditPreReviews(auth.email);
    return Response.json({ data: result }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "SHADOW_AUDIT_PRE_REVIEW_INCOMPLETE") {
      return Response.json({ error: "PRE_REVIEW_INCOMPLETE", message: "사전 검토가 없는 항목을 먼저 확인해 주세요." }, { status: 409, headers: HEADERS });
    }
    Sentry.captureException(error);
    return Response.json({ error: "SHADOW_AUDIT_CONFIRM_ERROR", message: "사전 검토안을 일괄 확정할 수 없습니다." }, { status: 500, headers: HEADERS });
  }
}
