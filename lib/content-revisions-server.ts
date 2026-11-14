import { getSupabaseAdmin } from "./supabase-admin";
import { mapRevisionSource } from "./content-revisions";

export const REVISION_HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" };
const SOURCE_FIELDS = "slug,title,subtitle,excerpt,category,tags,date,date_modified,content,published,updated_at,revision";
const PROPOSAL_FIELDS = "id,slug,base_revision,original,candidate,reason,status,created_at,applied_at,applied_revision";

export async function getRevisionSource(slug: string) {
  const { data, error } = await getSupabaseAdmin().from("blog_posts").select(SOURCE_FIELDS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? mapRevisionSource(data) : null;
}

export async function getContentRevision(id: string) {
  const { data, error } = await getSupabaseAdmin().from("blog_content_revisions").select(PROPOSAL_FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export function revisionResult(data: { status: string; [key: string]: unknown }) {
  if (data.status === "conflict") return Response.json({ error: "REVISION_CONFLICT", message: "원본이 변경됐습니다. 최신 내용을 읽고 수정안을 다시 작성하세요." }, { status: 409, headers: REVISION_HEADERS });
  if (data.status === "not_found") return Response.json({ error: "NOT_FOUND", message: "원본 또는 수정안을 찾을 수 없습니다." }, { status: 404, headers: REVISION_HEADERS });
  if (data.status === "already_applied") return Response.json({ error: "ALREADY_APPLIED", message: "이미 반영된 수정안입니다." }, { status: 409, headers: REVISION_HEADERS });
  if (data.status !== "created" && data.status !== "applied") throw new Error("Unexpected revision result");
  return Response.json({ data }, { status: data.status === "created" ? 201 : 200, headers: REVISION_HEADERS });
}

export function revisionUnavailable() {
  return Response.json({ error: "REVISION_UNAVAILABLE", message: "최신 원본·수정안 저장소에 접근할 수 없습니다. DB 연결과 026 마이그레이션 적용 상태를 확인하세요." }, { status: 503, headers: REVISION_HEADERS });
}
