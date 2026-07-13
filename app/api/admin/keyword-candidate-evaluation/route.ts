import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import { KEYWORD_CATEGORY_SLUGS } from "@/lib/admin-naver-datalab-keywords";
import {
  getKeywordCandidateEvaluationData,
  saveKeywordCandidateEvaluation,
} from "@/lib/keyword-candidate-evaluation-store";
import { unauthorizedResponse, verifyAdminRequest } from "../_lib/auth";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" } as const;
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
    const evaluation = await getKeywordCandidateEvaluationData();
    const labeled = evaluation.items.filter((item) => item.humanLabel != null).length;
    return Response.json({ data: {
      ...evaluation,
      stats: { total: evaluation.items.length, labeled, remaining: evaluation.items.length - labeled },
    } }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error && error.message === "ACTIVE_SEARCHAD_SNAPSHOT_NOT_FOUND"
      ? "활성 SearchAd 스냅샷이 없습니다. 먼저 검색 데이터를 갱신해 주세요."
      : "키워드 평가 데이터를 불러올 수 없습니다.";
    return Response.json({ error: "EVALUATION_READ_ERROR", message }, { status: 500, headers: HEADERS });
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
    const saved = await saveKeywordCandidateEvaluation(id, input, auth.email);
    return Response.json({ data: { id, humanLabel: saved } }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "EVALUATION_ITEM_NOT_FOUND") {
      return Response.json({ error: "NOT_FOUND", message: "평가 항목을 찾을 수 없습니다." }, { status: 404, headers: HEADERS });
    }
    Sentry.captureException(error);
    return Response.json({ error: "EVALUATION_SAVE_ERROR", message: "키워드 평가를 저장할 수 없습니다." }, { status: 500, headers: HEADERS });
  }
}
