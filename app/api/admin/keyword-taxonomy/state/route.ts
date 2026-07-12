import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import { unauthorizedResponse, verifyAdminRequest } from "../../_lib/auth";
import {
  discardPendingKeywordTaxonomy,
  getKeywordTaxonomyByVersion,
  getKeywordTaxonomyState,
  getPendingKeywordTaxonomyDiff,
  listKeywordTaxonomyVersions,
  restoreKeywordTaxonomyVersion,
} from "@/lib/admin-keyword-taxonomy";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("discard-pending") }),
  z.object({ action: z.literal("restore-version"), version: z.number().int().positive() }),
]);

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    // ?view=taxonomy&version=N → 특정 버전의 전체 택소노미 반환
    const viewParam = request.nextUrl.searchParams.get("view");
    const versionParam = request.nextUrl.searchParams.get("version");
    if (viewParam === "taxonomy") {
      const vNum = versionParam ? Number(versionParam) : null;
      const state = await getKeywordTaxonomyState();
      let target;
      if (vNum && state.pending?.version === vNum) target = state.pending;
      else if (vNum && state.active.version === vNum) target = state.active;
      else if (vNum) target = await getKeywordTaxonomyByVersion(vNum);
      else target = state.active;
      return Response.json({
        data: {
          version: target.version,
          taxonomy: target.taxonomy,
          activeTaxonomy: state.active.taxonomy,
        },
      }, { headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
    }

    const [state, versions, diff, pendingCandidateCount] = await Promise.all([
      getKeywordTaxonomyState(),
      listKeywordTaxonomyVersions(),
      getPendingKeywordTaxonomyDiff(),
      countPendingCandidates(),
    ]);
    const summarize = (taxonomy: typeof state.active.taxonomy) => ({
      categories: taxonomy.length,
      subgroups: taxonomy.reduce((sum, category) => sum + category.subGroups.length, 0),
      keywords: new Set(taxonomy.flatMap((category) => category.subGroups.flatMap((group) => group.keywords))).size,
    });
    return Response.json({
      data: {
        active: { version: state.active.version, createdAt: state.active.createdAt, ...summarize(state.active.taxonomy) },
        pending: state.pending
          ? { version: state.pending.version, createdAt: state.pending.createdAt, ...summarize(state.pending.taxonomy) }
          : null,
        versions,
        diff,
        pendingCandidateCount,
      },
    }, { headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "TAXONOMY_STATE_ERROR", message: "택소노미 상태를 확인할 수 없습니다." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

async function countPendingCandidates(): Promise<number> {
  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
  const { count, error } = await getSupabaseAdmin()
    .from("keyword_taxonomy_candidates")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    const input = actionSchema.parse(await request.json());
    if (input.action === "discard-pending") await discardPendingKeywordTaxonomy();
    else await restoreKeywordTaxonomyVersion(input.version, auth.email);
    return Response.json({ data: { ok: true } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "택소노미 버전을 변경할 수 없습니다.";
    return Response.json({ error: "TAXONOMY_STATE_UPDATE_ERROR", message }, { status: 400 });
  }
}
