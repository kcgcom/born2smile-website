import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import { getConceptReviewData, saveConceptReviewEntry } from "@/lib/content-coverage/concept-review-store";
import { COVERAGE_TOPIC_SPECS } from "@/lib/content-coverage/topic-specs";
import { unauthorizedResponse, verifyAdminRequest } from "../../_lib/auth";

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" } as const;
const supportLabel = z.enum(["supports", "partial", "not-supported"]);
const updateSchema = z.object({
  id: z.string().min(1),
  topicReviewLabel: z.enum(["relevant", "partial", "irrelevant"]),
  conceptLabels: z.record(z.string(), supportLabel),
  notes: z.string().max(1000),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  try {
    const review = await getConceptReviewData();
    const complete = review.items.filter((item) => item.topicReviewLabel != null
      && item.conceptIds.every((conceptId) => item.conceptLabels[conceptId] != null)).length;
    const conceptTotal = review.items.reduce((sum, item) => sum + item.conceptIds.length, 0);
    const conceptComplete = review.items.reduce((sum, item) => sum + item.conceptIds.filter((conceptId) => item.conceptLabels[conceptId] != null).length, 0);
    return Response.json({ data: {
      review,
      topics: COVERAGE_TOPIC_SPECS.map((spec) => ({
        id: spec.id,
        label: spec.label,
        description: spec.description,
        concepts: spec.concepts.map((concept) => ({ id: concept.id, label: concept.label, description: concept.description })),
      })),
      stats: { total: review.items.length, complete, remaining: review.items.length - complete, conceptTotal, conceptComplete },
    } }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "개념 근거 검토 데이터를 불러올 수 없습니다" }, { status: 500, headers: HEADERS });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR", message: "개념 검토 값이 올바르지 않습니다", issues: parsed.error.issues }, { status: 400, headers: HEADERS });
  try {
    const { id, ...input } = parsed.data;
    const saved = await saveConceptReviewEntry(id, input, auth.email);
    return Response.json({ data: { id, ...saved } }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === "CONCEPT_REVIEW_ITEM_NOT_FOUND") return Response.json({ error: "NOT_FOUND", message: "개념 검토 항목을 찾을 수 없습니다" }, { status: 404, headers: HEADERS });
    if (error instanceof Error && error.message === "CONCEPT_REVIEW_LABEL_MISMATCH") return Response.json({ error: "VALIDATION_ERROR", message: "판정해야 할 개념과 저장 값이 일치하지 않습니다" }, { status: 400, headers: HEADERS });
    Sentry.captureException(error);
    return Response.json({ error: "API_ERROR", message: "개념 근거 검토 결과를 저장할 수 없습니다" }, { status: 500, headers: HEADERS });
  }
}
