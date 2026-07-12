import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import { unauthorizedResponse, verifyAdminRequest } from "../../_lib/auth";
import {
  listKeywordTaxonomyCandidates,
  refreshKeywordTaxonomyCandidates,
  reviewKeywordTaxonomyCandidate,
  createTaxonomySubgroupFromCandidates,
  approveKeywordTaxonomyCandidates,
  batchReviewKeywordTaxonomyCandidates,
} from "@/lib/admin-keyword-taxonomy";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const reviewSchema = z.discriminatedUnion("action", [
  z.object({
    id: z.string().uuid(),
    action: z.enum(["approve", "defer", "reject"]),
    targetCategory: z.enum(["implant", "orthodontics", "prosthetics", "restorative", "prevention", "pediatric", "health-tips", "dental-choice"]).optional(),
    targetSubgroup: z.string().min(1).max(30).optional(),
  }),
  z.object({
    action: z.literal("create-subgroup"),
    candidateIds: z.array(z.string().uuid()).min(2).max(20),
    category: z.enum(["implant", "orthodontics", "prosthetics", "restorative", "prevention", "pediatric", "health-tips", "dental-choice"]),
    subgroupName: z.string().trim().min(2).max(30),
    searchIntent: z.enum(["informational", "commercial", "transactional", "navigational"]),
    topicTemplate: z.string().trim().min(5).max(120).refine((value) => value.includes("{keyword}"), "제목 템플릿에 {keyword}가 필요합니다."),
    topicAspect: z.string().trim().min(2).max(120),
  }),
  z.object({
    action: z.literal("batch-approve"),
    items: z.array(z.object({
      id: z.string().uuid(),
      category: z.enum(["implant", "orthodontics", "prosthetics", "restorative", "prevention", "pediatric", "health-tips", "dental-choice"]),
      subgroup: z.string().min(1).max(30),
    })).min(1).max(50),
  }),
  z.object({
    action: z.literal("batch-review"),
    items: z.array(z.object({
      id: z.string().uuid(),
      decision: z.enum(["approve", "defer", "reject"]),
      category: z.enum(["implant", "orthodontics", "prosthetics", "restorative", "prevention", "pediatric", "health-tips", "dental-choice"]).optional(),
      subgroup: z.string().min(1).max(30).optional(),
    })).min(1).max(100),
  }),
]);

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" };

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    if (request.nextUrl.searchParams.get("refresh") === "true") {
      try {
        await refreshKeywordTaxonomyCandidates();
        await updateLatestCandidateAnalysis("completed", null);
      } catch (error) {
        await updateLatestCandidateAnalysis("failed", error instanceof Error ? error.message : "후보 분석에 실패했습니다.");
        throw error;
      }
    }
    return Response.json({ data: await listKeywordTaxonomyCandidates() }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "CANDIDATE_READ_ERROR", message: "키워드 후보를 불러올 수 없습니다." },
      { status: 500, headers: HEADERS },
    );
  }
}

async function updateLatestCandidateAnalysis(status: "completed" | "failed", errorMessage: string | null) {
  const admin = getSupabaseAdmin();
  const { data: job } = await admin
    .from("searchad_sync_jobs")
    .select("id")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!job) return;
  await admin.from("searchad_sync_jobs").update({
    candidate_analysis_status: status,
    candidate_analysis_error: errorMessage,
    ...(status === "completed" ? { candidate_analyzed_at: new Date().toISOString() } : {}),
  }).eq("id", job.id);
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    const input = reviewSchema.parse(await request.json());
    if (input.action === "create-subgroup") {
      await createTaxonomySubgroupFromCandidates(
        input.candidateIds,
        input.category,
        input.subgroupName,
        input.searchIntent,
        input.topicTemplate,
        input.topicAspect,
        auth.email,
      );
    } else if (input.action === "batch-approve") {
      await approveKeywordTaxonomyCandidates(input.items, auth.email);
    } else if (input.action === "batch-review") {
      await batchReviewKeywordTaxonomyCandidates(
        input.items.map((item) => ({
          id: item.id,
          action: item.decision,
          category: item.category,
          subgroup: item.subgroup,
        })),
        auth.email,
      );
    } else {
      await reviewKeywordTaxonomyCandidate(
        input.id,
        input.action,
        auth.email,
        input.targetCategory && input.targetSubgroup
          ? { category: input.targetCategory, subgroup: input.targetSubgroup }
          : undefined,
      );
    }
    return Response.json({ data: { ok: true } }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "키워드 후보를 처리할 수 없습니다.";
    return Response.json({ error: "CANDIDATE_REVIEW_ERROR", message }, { status: 400, headers: HEADERS });
  }
}
