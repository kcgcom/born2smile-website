import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ResearchPage } from "@/lib/research/types";

const HEADERS = { "Cache-Control": "private, no-store" } as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("research_pages")
    .select("data")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return Response.json(
      { error: "NOT_FOUND", message: `연구 자료를 찾을 수 없습니다: ${slug}` },
      { status: 404, headers: HEADERS },
    );
  }

  return Response.json({ data: data.data }, { headers: HEADERS });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { slug } = await params;

  let body: Partial<ResearchPage>;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "BAD_REQUEST", message: "요청 본문을 파싱할 수 없습니다" },
      { status: 400, headers: HEADERS },
    );
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("research_pages")
    .upsert(
      { slug, data: body, updated_at: new Date().toISOString() },
      { onConflict: "slug" },
    );

  if (error) {
    return Response.json(
      { error: "DB_ERROR", message: "저장에 실패했습니다" },
      { status: 500, headers: HEADERS },
    );
  }

  revalidatePath(`/research/${slug}`);

  return Response.json({ ok: true }, { headers: HEADERS });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { slug } = await params;

  let body: { verified: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "BAD_REQUEST", message: "요청 본문을 파싱할 수 없습니다" },
      { status: 400, headers: HEADERS },
    );
  }

  if (typeof body.verified !== "boolean") {
    return Response.json(
      { error: "BAD_REQUEST", message: "verified 필드가 필요합니다" },
      { status: 400, headers: HEADERS },
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("research_pages")
    .update({ verified: body.verified, updated_at: new Date().toISOString() })
    .eq("slug", slug);

  if (error) {
    return Response.json(
      { error: "DB_ERROR", message: "저장에 실패했습니다" },
      { status: 500, headers: HEADERS },
    );
  }

  revalidatePath(`/research/${slug}`);
  revalidatePath("/research");

  return Response.json({ ok: true, verified: body.verified }, { headers: HEADERS });
}
