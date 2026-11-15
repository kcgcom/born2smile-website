import { z } from "zod/v4";
import { verifyAdminRequest, unauthorizedResponse } from "../../../_lib/auth";
import { taskDraftSchema, taskDraftSlug } from "@/lib/content-task-drafts";
import { loadTask, planTaskCommand, readTaskBody, TASK_HEADERS, TaskError, taskFailure, taskHash } from "@/lib/content-tasks-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getTodayKST } from "@/lib/date";
import { revisionContentSchema, revisionReadTime } from "@/lib/content-revisions";
import { validateBlogCitationTargets } from "@/lib/blog/citation-targets-server";

// Insert-only: a task has one deterministic draft slug. Retrying never overwrites an editor's work.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (auth.email !== "agent:content") return taskFailure(new TaskError(403, "AGENT_KEY_REQUIRED", "콘텐츠 에이전트 키가 필요합니다."));
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return taskFailure(new TaskError(400, "INVALID_ID", "작업 ID가 올바르지 않습니다."));
  try {
    const parsed = taskDraftSchema.safeParse(await readTaskBody(request));
    if (!parsed.success) throw new TaskError(400, "INVALID_DRAFT", "원고 내용·작업 버전·점유 토큰을 확인하세요.");
    const row = await loadTask(id);
    if (row.item_type !== "blog" || row.target_page.startsWith("/blog/")) throw new TaskError(400, "NEW_BLOG_REQUIRED", "신규 블로그 작업만 초안을 생성할 수 있습니다. 기존 글은 수정안을 제출하세요.");
    // Validate ownership and version without changing the task; submit remains a separate CAS operation.
    planTaskCommand(row, { action: "progress", baseUpdatedAt: parsed.data.baseUpdatedAt, claimToken: parsed.data.claimToken, message: "초안 저장" , blockedReason: null });
    const candidate = parsed.data.candidate;
    const issues = await validateBlogCitationTargets(candidate.blocks, false);
    if (issues.length) throw new TaskError(400, "INVALID_CITATIONS", "원고의 논문 출처 연결을 확인하세요.");
    const slug = taskDraftSlug(id);
    const db = getSupabaseAdmin();
    const { error } = await db.from("blog_posts").insert({
      slug, title: candidate.title, subtitle: candidate.subtitle, excerpt: candidate.excerpt,
      category: candidate.category, tags: candidate.tags, content: candidate.blocks,
      date: getTodayKST(), published: false, date_modified: null,
      read_time: revisionReadTime(candidate), updated_by: `agent:task:${id}`,
    });
    if (error?.code === "23505") {
      const { data: existing, error: readError } = await db.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
      if (readError) throw readError;
      // Pick the exact content fields: database metadata is never part of the candidate contract.
      const content = existing && revisionContentSchema.safeParse({ title: existing.title, subtitle: existing.subtitle, excerpt: existing.excerpt, category: existing.category, tags: existing.tags, blocks: existing.content });
      if (!existing || existing.published || existing.updated_by !== `agent:task:${id}` || !content?.success || taskHash(content.data) !== taskHash(candidate)) throw new TaskError(409, "DRAFT_CONFLICT", "이 작업의 원고가 이미 저장·수정됐습니다. 기존 원고를 검토하세요.");
    } else if (error) throw error;
    return Response.json({ data: { postSlug: slug, published: false, updatedAt: row.updated_at }, replayed: Boolean(error), reviewUrl: `/admin/content/posts/${slug}` }, { status: error ? 200 : 201, headers: TASK_HEADERS });
  } catch (error) { return taskFailure(error); }
}
