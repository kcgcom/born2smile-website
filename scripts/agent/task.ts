import { z } from "zod/v4";
import { taskCommandSchema, taskProposalSchema, taskResultSchema } from "../../lib/content-tasks";
import { revisionContentSchema } from "../../lib/content-revisions";
import { validateBaseUrl } from "./context";

export const taskSessionSchema = z.object({ origin: z.string().transform(validateBaseUrl), id: z.uuid(), updatedAt: z.iso.datetime({ offset: true }), claimToken: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export type TaskSession = z.infer<typeof taskSessionSchema>;
export const taskActions = ["list", "get", "propose", "claim", "progress", "release", "draft", "submit"] as const;
export type TaskAction = typeof taskActions[number];

export function taskRequest(action: TaskAction, options: { id?: string; workerId?: string; status?: string; session?: TaskSession; input?: unknown; requestId: string }) {
  const session = options.session;
  const id = z.uuid().parse(session?.id ?? options.id);
  const path = `/api/admin/content-tasks/${id}`;
  if (action === "get") return { path, method: "GET" };
  if (action === "claim") return { path, method: "PATCH", body: taskCommandSchema.parse({ action, workerId: options.workerId, baseUpdatedAt: (options.input as { updatedAt?: unknown })?.updatedAt }) };
  if (!session) throw new Error("점유 세션 파일이 필요합니다.");
  const base = { baseUpdatedAt: session.updatedAt, claimToken: session.claimToken };
  if (action === "draft") return { path: `${path}/draft`, method: "POST", body: { ...base, candidate: revisionContentSchema.parse(options.input) } };
  if (action === "submit") return { path, method: "PATCH", body: taskCommandSchema.parse({ ...base, action, requestId: options.requestId, result: taskResultSchema.parse(options.input) }) };
  const report = z.object({ message: z.string(), blockedReason: z.string().nullable().optional() }).strict().parse(options.input);
  return { path, method: "PATCH", body: taskCommandSchema.parse({ ...base, action, message: report.message, ...(action === "progress" ? { blockedReason: report.blockedReason ?? null } : {}) }) };
}

export function collectionTaskRequest(action: "list" | "propose", input?: unknown, status?: string) {
  if (action === "propose") return { path: "/api/admin/content-tasks", method: "POST", body: taskProposalSchema.parse(input) };
  const parsed = z.enum(["deferred", "approved", "in_progress", "review", "scheduled", "published", "dismissed"]).optional().parse(status);
  return { path: `/api/admin/content-tasks${parsed ? `?status=${parsed}` : ""}`, method: "GET" };
}
