import { z } from "zod/v4";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { taskCommandSchema } from "@/lib/content-tasks";
import { loadTask, planTaskCommand, readTaskBody, saveTask, TASK_HEADERS, TaskError, taskFailure, taskView, validateTaskResult } from "@/lib/content-tasks-server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return taskFailure(new TaskError(400, "INVALID_ID", "작업 ID가 올바르지 않습니다."));
  try { return Response.json({ data: taskView(await loadTask(id)) }, { headers: TASK_HEADERS }); }
  catch (error) { return taskFailure(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (auth.email !== "agent:content") return taskFailure(new TaskError(403, "AGENT_KEY_REQUIRED", "작업 보고에는 콘텐츠 에이전트 키가 필요합니다."));
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return taskFailure(new TaskError(400, "INVALID_ID", "작업 ID가 올바르지 않습니다."));
  try {
    const parsed = taskCommandSchema.safeParse(await readTaskBody(request));
    if (!parsed.success) return taskFailure(new TaskError(400, "INVALID_COMMAND", "작업 버전·점유 토큰·보고 내용을 확인하세요."));
    const row = await loadTask(id);
    const plan = planTaskCommand(row, parsed.data);
    if (plan.replayed) return Response.json({ data: taskView(row), replayed: true }, { headers: TASK_HEADERS });
    if (parsed.data.action === "submit") await validateTaskResult(row, parsed.data.result);
    const saved = await saveTask(row, plan.changes);
    return Response.json({ data: taskView(saved), ...(plan.claimToken ? { claimToken: plan.claimToken } : {}) }, { headers: TASK_HEADERS });
  } catch (error) { return taskFailure(error); }
}
