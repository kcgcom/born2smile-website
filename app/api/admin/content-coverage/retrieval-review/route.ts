import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { RETRIEVAL_REASON_TAGS } from "@/lib/content-coverage/retrieval-evaluation";
import { getRetrievalReviewData, saveRetrievalReviewEntry } from "@/lib/content-coverage/retrieval-review-store";
import { COVERAGE_TOPIC_SPECS } from "@/lib/content-coverage/topic-specs";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" } as const;
const updateSchema = z.object({
  id: z.string().min(1),
  label: z.enum(["relevant", "partial", "irrelevant"]),
  reasonTags: z.array(z.enum(RETRIEVAL_REASON_TAGS)).max(6),
  notes: z.string().max(1000),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  try {
    const review = await getRetrievalReviewData();
    const labeled = review.items.filter((item) => item.label != null).length;
    return Response.json({ data: {
      review,
      topics: COVERAGE_TOPIC_SPECS.map((spec) => ({ id: spec.id, label: spec.label, description: spec.description, exclusions: spec.exclusions, concepts: spec.concepts.map((concept) => concept.label) })),
      stats: { total: review.items.length, labeled, remaining: review.items.length - labeled },
      reasonTags: RETRIEVAL_REASON_TAGS,
    } }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "임베딩 근거 검토 데이터를 불러올 수 없습니다" }, { status: 500, headers: HEADERS });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR", message: "검토 값이 올바르지 않습니다", issues: parsed.error.issues }, { status: 400, headers: HEADERS });
  try {
    const { id, ...input } = parsed.data;
    const saved = await saveRetrievalReviewEntry(id, input, auth.email);
    return Response.json({ data: { id, ...saved } }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "REVIEW_ITEM_NOT_FOUND") return Response.json({ error: "NOT_FOUND", message: "검토 항목을 찾을 수 없습니다" }, { status: 404, headers: HEADERS });
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "임베딩 근거 검토 결과를 저장할 수 없습니다" }, { status: 500, headers: HEADERS });
  }
}
