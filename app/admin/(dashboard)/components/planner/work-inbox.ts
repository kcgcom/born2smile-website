import type { ContentPlannerItem } from "@/lib/content-planner";
import type { TaskWorkflow } from "@/lib/content-tasks";
import { ADMIN_HOME } from "@/lib/admin-access";

export function revisionHref(href: string, returnTo?: string) {
  return returnTo ? `${href}?${new URLSearchParams({ returnTo })}` : href;
}

export function revisionReturnHref(returnTo?: string) {
  const listPath = ADMIN_HOME.content;
  if (returnTo === listPath || returnTo?.startsWith(`${listPath}?`) || returnTo?.startsWith(`${listPath}#`)) {
    return returnTo;
  }
  return `${listPath}?stage=review#pending-revisions`;
}

export const WORK_ATTENTION = [
  { id: "approval", label: "승인 대기" },
  { id: "blocked", label: "막힌 작업" },
] as const;

export function needsWorkAttention(item: ContentPlannerItem, attention: typeof WORK_ATTENTION[number]["id"]) {
  const stage = workStage(item);
  const workflow = item.sourceSnapshot.taskWorkflow as TaskWorkflow | undefined;
  return attention === "approval"
    ? stage === "proposals" && workflow?.proposalPending === true
    : stage !== "done" && stage !== "archive" && Boolean(workflow?.blockedReason);
}

export const WORK_STAGES = [
  { id: "proposals", label: "제안 대기" },
  { id: "working", label: "작업 중" },
  { id: "review", label: "검토 필요" },
  { id: "done", label: "완료" },
] as const;
export type WorkStage = typeof WORK_STAGES[number]["id"] | "archive";

export function workStage(item: ContentPlannerItem): WorkStage {
  switch (item.status) {
    case "deferred": return "proposals";
    case "approved": case "in_progress": return "working";
    case "review": case "scheduled": return "review";
    case "published": return "done";
    case "dismissed": return "archive";
  }
}

export function internalTarget(value: string): string | null {
  return /^\/(?:treatments\/[a-z-]+|blog\/[a-z-]+\/[a-z0-9-]+|faq)\/?$/.test(value) ? value : null;
}

export function workResult(item: ContentPlannerItem) {
  const result = item.brief.result;
  const explicit = result && typeof result === "object" && !Array.isArray(result) ? result as Record<string, unknown> : {};
  const targetSlug = /^\/blog\/[a-z-]+\/([a-z0-9-]+)\/?$/.exec(item.targetPage)?.[1];
  const postSlug = typeof explicit.postSlug === "string" && /^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/.test(explicit.postSlug) ? explicit.postSlug : targetSlug ?? null;
  const revisionId = typeof explicit.revisionId === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(explicit.revisionId) ? explicit.revisionId : null;
  return { postSlug, revisionId };
}
