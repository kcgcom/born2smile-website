import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { taskProposalSchema } from "@/lib/content-tasks";
import { readTaskBody, TASK_HEADERS, TaskError, taskFailure, taskHash, taskView, type TaskRow } from "@/lib/content-tasks-server";

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const status = new URL(request.url).searchParams.get("status");
  if (status && !["deferred", "approved", "in_progress", "review", "scheduled", "published", "dismissed"].includes(status)) return taskFailure(new TaskError(400, "INVALID_STATUS", "작업 상태가 올바르지 않습니다."));
  try {
    let query = getSupabaseAdmin().from("content_planner_items").select("*").order("updated_at", { ascending: false }).limit(101);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ data: (data ?? []).slice(0, 100).map(taskView), truncated: (data?.length ?? 0) > 100 }, { headers: TASK_HEADERS });
  } catch (error) { return taskFailure(error); }
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  try {
    const parsed = taskProposalSchema.safeParse(await readTaskBody(request));
    if (!parsed.success) return taskFailure(new TaskError(400, "INVALID_PROPOSAL", "제안의 대상·근거·변경 범위·완료 기준을 확인하세요."));
    const input = parsed.data;
    const proposalHash = taskHash(input);
    const key = `agent:${input.proposalKey}`;
    const { data, error } = await getSupabaseAdmin().from("content_planner_items").insert({
      opportunity_key: key, item_type: input.itemType, title: input.title, category: input.category, target_page: input.targetPage,
      status: "deferred", priority: "watch", rationale: input.rationale,
      brief: { outline: input.scope, checklist: input.acceptanceCriteria },
      source_snapshot: { evidence: input.evidence, taskWorkflow: { version: 1, proposalPending: true, proposedBy: input.workerId, proposalHash } },
      created_by: auth.email,
    }).select("*").single();
    if (error?.code === "23505") {
      const previous = await getSupabaseAdmin().from("content_planner_items").select("*").eq("opportunity_key", key).maybeSingle();
      if (previous.error) throw previous.error;
      if (!previous.data || previous.data.source_snapshot?.taskWorkflow?.proposalHash !== proposalHash) return taskFailure(new TaskError(409, "PROPOSAL_CONFLICT", "같은 식별자로 다른 제안이 이미 등록됐습니다."));
      return Response.json({ data: taskView(previous.data as TaskRow), replayed: true }, { headers: TASK_HEADERS });
    }
    if (error) throw error;
    return Response.json({ data: taskView(data as TaskRow), reviewUrl: `/admin/content/tasks?opportunity=${encodeURIComponent(key)}` }, { status: 201, headers: TASK_HEADERS });
  } catch (error) { return taskFailure(error); }
}
