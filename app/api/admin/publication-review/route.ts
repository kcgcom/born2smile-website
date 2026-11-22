import { z } from "zod/v4";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { unauthorizedResponse, verifyAdminRequest } from "../_lib/auth";

const HEADERS = { "Cache-Control": "private, no-store" };
const requestSchema = z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,200}$/) });

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const db = getSupabaseAdmin();
  const [drafts, revisions] = await Promise.all([
    db.from("blog_posts").select("slug,title,publication_review_requested_at")
      .eq("published", false).not("publication_review_requested_at", "is", null)
      .order("publication_review_requested_at", { ascending: false }),
    db.from("blog_content_revisions").select("id,slug,reason,created_at")
      .eq("status", "draft").order("created_at", { ascending: false }),
  ]);
  if (drafts.error || revisions.error) {
    return Response.json({ message: "검토 대기 목록을 불러올 수 없습니다." }, { status: 500, headers: HEADERS });
  }
  return Response.json({ data: { drafts: drafts.data, revisions: revisions.data } }, { headers: HEADERS });
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "원고 주소가 올바르지 않습니다." }, { status: 400, headers: HEADERS });
  const { data, error } = await getSupabaseAdmin().from("blog_posts")
    .update({ publication_review_requested_at: new Date().toISOString() })
    .eq("slug", parsed.data.slug).eq("published", false).select("slug").maybeSingle();
  if (error) return Response.json({ message: "검토 요청을 저장할 수 없습니다." }, { status: 500, headers: HEADERS });
  if (!data) return Response.json({ message: "미발행 초안만 검토 요청할 수 있습니다." }, { status: 409, headers: HEADERS });
  return Response.json({ data }, { headers: HEADERS });
}
