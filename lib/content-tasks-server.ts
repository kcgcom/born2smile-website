import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "./supabase-admin";
import { mapPlannerRow, type ContentPlannerItem } from "./content-planner";
import { nextTaskVersion, taskWorkflow, type TaskCommand, type TaskResult, type TaskWorkflow } from "./content-tasks";

export const TASK_HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export class TaskError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const taskConflict = () => new TaskError(409, "TASK_CONFLICT", "작업이 변경됐거나 다른 작업자가 점유 중입니다. 최신 작업을 다시 조회하세요.");
export function taskHash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
export type TaskRow = { id: string; opportunity_key: string; item_type: ContentPlannerItem["itemType"]; title: string; category: string; target_page: string; status: ContentPlannerItem["status"]; priority: ContentPlannerItem["priority"]; rationale: string; brief: Record<string, unknown>; source_snapshot: Record<string, unknown>; due_date: string | null; created_by: string; created_at: string; updated_at: string };

export function taskView(row: TaskRow) {
  const task = mapPlannerRow(row);
  const workflow = taskWorkflow(row.source_snapshot);
  const { claimHash: _claim, proposalHash: _proposal, requestHash: _request, ...visible } = workflow;
  void _claim; void _proposal; void _request;
  return { id: task.id, opportunityKey: task.opportunityKey, itemType: task.itemType, title: task.title, category: task.category, targetPage: task.targetPage, status: task.status, priority: task.priority, rationale: task.rationale, brief: task.brief, dueDate: task.dueDate, updatedAt: task.updatedAt, workflow: visible };
}
export async function loadTask(id: string): Promise<TaskRow> {
  const { data, error } = await getSupabaseAdmin().from("content_planner_items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new TaskError(404, "TASK_NOT_FOUND", "작업을 찾을 수 없습니다.");
  return data;
}
export async function saveTask(row: TaskRow, changes: Record<string, unknown>) {
  const { data, error } = await getSupabaseAdmin().from("content_planner_items").update({ ...changes, updated_at: nextTaskVersion(row.updated_at) }).eq("id", row.id).eq("updated_at", row.updated_at).select("*").maybeSingle();
  if (error) throw error;
  if (!data) throw taskConflict();
  return data as TaskRow;
}

export function planTaskCommand(row: TaskRow, command: TaskCommand, now = Date.now(), newToken = randomBytes(32).toString("hex")) {
  const workflow = taskWorkflow(row.source_snapshot);
  const supplied = "claimToken" in command ? taskHash(command.claimToken) : "";
  const owned = Boolean(typeof workflow.claimHash === "string" && /^[a-f0-9]{64}$/.test(workflow.claimHash) && supplied.length === workflow.claimHash.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(workflow.claimHash)));
  const requestHash = command.action === "submit" ? taskHash(command.result) : null;
  if (command.action === "submit" && owned && row.status === "review" && workflow.requestId === command.requestId) {
    if (workflow.requestHash !== requestHash) throw taskConflict();
    return { replayed: true as const };
  }
  if (row.updated_at !== command.baseUpdatedAt) throw taskConflict();
  if (row.status !== "approved" && row.status !== "in_progress") throw new TaskError(409, "TASK_NOT_APPROVED", "관리자가 승인한 작업만 진행할 수 있습니다.");
  const active = Boolean(workflow.leaseExpiresAt && Date.parse(workflow.leaseExpiresAt) > now);
  let next: TaskWorkflow;
  let status: TaskRow["status"] = row.status;
  let claimToken: string | undefined;
  let brief = row.brief;
  if (command.action === "claim") {
    if (active) throw taskConflict();
    claimToken = newToken;
    next = { ...workflow, workerId: command.workerId, claimHash: taskHash(newToken), leaseExpiresAt: new Date(now + 15 * 60_000).toISOString(), blockedReason: null, proposalPending: false };
    status = "in_progress";
  } else {
    if (!owned || !active) throw new TaskError(409, "CLAIM_REQUIRED", "유효한 작업 점유 토큰이 필요합니다. 만료된 작업은 다시 점유하세요.");
    next = { ...workflow, reportedAt: new Date(now).toISOString(), leaseExpiresAt: new Date(now + 15 * 60_000).toISOString() };
    if (command.action === "progress") next = { ...next, message: command.message, blockedReason: command.blockedReason };
    if (command.action === "release") next = { ...next, message: command.message, claimHash: undefined, leaseExpiresAt: null };
    if (command.action === "submit") {
      status = "review";
      next = { ...next, blockedReason: null, leaseExpiresAt: null, requestId: command.requestId, requestHash: requestHash!, result: command.result, message: command.result.summary };
      brief = { ...brief, result: command.result };
    }
  }
  return { replayed: false as const, claimToken, changes: { status, brief, source_snapshot: { ...row.source_snapshot, taskWorkflow: next } } };
}

export async function validateTaskResult(row: TaskRow, result: TaskResult) {
  if (result.kind === "code") {
    if (row.item_type === "blog") throw new TaskError(400, "INVALID_RESULT", "블로그 작업에는 원고 또는 수정안을 제출하세요.");
    return;
  }
  if (row.item_type !== "blog") throw new TaskError(400, "INVALID_RESULT", "페이지·FAQ 작업에는 코드 변경안을 제출하세요.");
  const targetSlug = /^\/blog\/[^/]+\/([^/]+)\/?$/.exec(row.target_page)?.[1];
  if (targetSlug && targetSlug !== result.postSlug) throw new TaskError(400, "TARGET_MISMATCH", "작업 대상과 제출한 포스트가 다릅니다.");
  if (result.kind === "draft") {
    const { data, error } = await getSupabaseAdmin().from("blog_posts").select("slug,published").eq("slug", result.postSlug).maybeSingle();
    if (error) throw error;
    if (!data || data.published) throw new TaskError(400, "DRAFT_REQUIRED", "저장된 비공개 초안만 제출할 수 있습니다.");
  } else {
    const { data, error } = await getSupabaseAdmin().from("blog_content_revisions").select("slug,status").eq("id", result.revisionId).maybeSingle();
    if (error) throw error;
    if (!data || data.slug !== result.postSlug || data.status !== "draft") throw new TaskError(400, "REVISION_REQUIRED", "대상 포스트의 미반영 수정안이 필요합니다.");
  }
}

export async function readTaskBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let length = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.length;
    if (length > 64 * 1024) { await reader.cancel(); throw new TaskError(413, "PAYLOAD_TOO_LARGE", "요청 크기가 너무 큽니다."); }
    chunks.push(part.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return null; }
}
export function taskFailure(error: unknown) {
  if (error instanceof TaskError) return Response.json({ error: error.code, message: error.message }, { status: error.status, headers: TASK_HEADERS });
  return Response.json({ error: "TASK_UNAVAILABLE", message: "작업 저장소에 접근할 수 없습니다. 잠시 후 다시 시도하세요." }, { status: 503, headers: TASK_HEADERS });
}
