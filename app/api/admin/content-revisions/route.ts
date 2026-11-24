import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { createRevisionSchema } from "@/lib/content-revisions";
import { getRevisionSource, REVISION_HEADERS, revisionResult, revisionUnavailable } from "@/lib/content-revisions-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateBlogCitationTargets } from "@/lib/blog/citation-targets-server";

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const params = new URL(request.url).searchParams;
  if (params.get("scope") === "mine") {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from("blog_content_revisions")
        .select("id,slug,title:original->>title,status,created_at")
        .eq("created_by", auth.email)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(50);
      if (error) throw error;
      return Response.json({ data }, { headers: REVISION_HEADERS });
    } catch { return revisionUnavailable(); }
  }
  const slug = params.get("slug");
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/.test(slug)) return Response.json({ error: "INVALID_SLUG" }, { status: 400, headers: REVISION_HEADERS });
  try {
    const { data, error } = await getSupabaseAdmin().from("blog_content_revisions").select("id,slug,base_revision,reason,status,created_at,applied_at").eq("slug", slug).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return Response.json({ data }, { headers: REVISION_HEADERS });
  } catch { return revisionUnavailable(); }
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = createRevisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR", issues: parsed.error.issues }, { status: 400, headers: REVISION_HEADERS });
  try {
    const input = parsed.data;
    const source = await getRevisionSource(input.slug);
    if (!source) return revisionResult({ status: "not_found" });
    if (source.revision !== input.baseRevision) return revisionResult({ status: "conflict" });
    const issues = await validateBlogCitationTargets(input.candidate.blocks, source.published);
    if (issues.length) return Response.json({ error: "VALIDATION_ERROR", issues }, { status: 400, headers: REVISION_HEADERS });
    const { data, error } = await getSupabaseAdmin().rpc("create_blog_content_revision", {
      p_slug: input.slug, p_base_revision: input.baseRevision, p_candidate: input.candidate, p_reason: input.reason, p_actor: auth.email,
    });
    if (error) throw error;
    return revisionResult(data);
  } catch { return revisionUnavailable(); }
}
