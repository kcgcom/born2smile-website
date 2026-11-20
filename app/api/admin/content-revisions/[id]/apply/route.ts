import { z } from "zod/v4";
import { after } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../../../_lib/auth";
import { revisionContentSchema, revisionReadTime } from "@/lib/content-revisions";
import { getContentRevision, getRevisionSource, REVISION_HEADERS, revisionResult, revisionUnavailable } from "@/lib/content-revisions-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateBlogCitationTargets } from "@/lib/blog/citation-targets-server";
import { revalidateBlogCaches } from "../../../_lib/blog-cache";
import { normalizeBlogCategory } from "@/lib/blog/category-slugs";
import { submitBlogPostToIndexNow } from "@/lib/indexnow";
import { getTodayKST } from "@/lib/date";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  // Applying a revision is a distinct human-admin operation, never a CLI key operation.
  if (auth.email === "cli@admin" || auth.email.startsWith("agent:")) return Response.json({ error: "FORBIDDEN", message: "수정안 반영에는 관리자 로그인이 필요합니다." }, { status: 403, headers: REVISION_HEADERS });
  const { id } = await params;
  const confirmation = z.object({ confirm: z.literal(true) }).strict().safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !confirmation.success) return Response.json({ error: "INVALID_CONFIRMATION" }, { status: 400, headers: REVISION_HEADERS });
  try {
    const proposal = await getContentRevision(id);
    if (!proposal) return revisionResult({ status: "not_found" });
    if (proposal.status !== "draft") return revisionResult({ status: "already_applied" });
    const source = await getRevisionSource(proposal.slug);
    if (!source) return revisionResult({ status: "not_found" });
    if (source.revision !== proposal.base_revision) return revisionResult({ status: "conflict" });
    const candidate = revisionContentSchema.parse(proposal.candidate);
    const issues = await validateBlogCitationTargets(candidate.blocks, source.published);
    if (issues.length) return Response.json({ error: "VALIDATION_ERROR", issues }, { status: 400, headers: REVISION_HEADERS });
    const { data, error } = await getSupabaseAdmin().rpc("apply_blog_content_revision", { p_id: id, p_actor: auth.email, p_read_time: revisionReadTime(candidate) });
    if (error) throw error;
    if (data.status !== "applied") return revisionResult(data);
    // A post-commit cache or indexing failure must not report the DB write as failed.
    let cacheRefreshPending = false;
    try { revalidateBlogCaches({ slug: data.slug, category: normalizeBlogCategory(data.category) ?? undefined, previousCategory: normalizeBlogCategory(data.previousCategory) ?? undefined }); }
    catch { cacheRefreshPending = true; }
    if (data.published && data.date <= getTodayKST()) {
      after(() => submitBlogPostToIndexNow(data.slug, data.category, "revision_apply"));
    }
    return revisionResult({ ...data, cacheRefreshPending });
  } catch { return revisionUnavailable(); }
}
