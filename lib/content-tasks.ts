import { z } from "zod/v4";
import { plannerItemTypes } from "./content-planner";

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/);
const target = z.string().regex(/^\/(?:treatments\/[a-z-]+|blog\/[a-z-]+\/[a-z0-9-]+|faq)\/?$/);
const file = z.string().max(240).regex(/^(?:app|components|lib)\/[a-zA-Z0-9_\-/[\].()]+$/).refine(value => !value.split("/").includes("..") && !value.includes(".env"), "허용되지 않은 파일 경로입니다");
export const taskResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("revision"), postSlug: slug, revisionId: z.uuid(), summary: z.string().trim().min(5).max(2000) }).strict(),
  z.object({ kind: z.literal("draft"), postSlug: slug, summary: z.string().trim().min(5).max(2000) }).strict(),
  z.object({ kind: z.literal("code"), summary: z.string().trim().min(5).max(2000), files: z.array(file).min(1).max(30), pullRequestUrl: z.string().regex(/^https:\/\/github\.com\/kcgcom\/born2smile-website\/pull\/[1-9][0-9]*$/) }).strict(),
]);
export type TaskResult = z.infer<typeof taskResultSchema>;
export const taskProposalSchema = z.object({
  proposalKey: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9:_-]{2,199}$/),
  workerId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,79}$/),
  itemType: z.enum(plannerItemTypes), title: z.string().trim().min(2).max(160),
  category: z.string().trim().min(1).max(80), targetPage: target,
  rationale: z.string().trim().min(5).max(1000),
  scope: z.array(z.string().trim().min(2).max(500)).min(1).max(20),
  acceptanceCriteria: z.array(z.string().trim().min(2).max(500)).min(1).max(20),
  evidence: z.array(z.object({ source: z.string().trim().min(2).max(120), summary: z.string().trim().min(5).max(1500) }).strict()).min(1).max(10),
}).strict();
const base = { baseUpdatedAt: z.iso.datetime({ offset: true }) };
const credential = z.string().regex(/^[a-f0-9]{64}$/);
export const taskCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("claim"), workerId: taskProposalSchema.shape.workerId }).strict(),
  z.object({ ...base, action: z.literal("progress"), claimToken: credential, message: z.string().trim().min(2).max(1500), blockedReason: z.string().trim().min(2).max(1000).nullable().default(null) }).strict(),
  z.object({ ...base, action: z.literal("release"), claimToken: credential, message: z.string().trim().min(2).max(1500) }).strict(),
  z.object({ ...base, action: z.literal("submit"), claimToken: credential, requestId: z.uuid(), result: taskResultSchema }).strict(),
]);
export type TaskCommand = z.infer<typeof taskCommandSchema>;
export type TaskWorkflow = {
  version: 1; proposalHash?: string; proposedBy?: string; proposalPending?: boolean;
  workerId?: string; claimHash?: string; leaseExpiresAt?: string | null;
  message?: string; blockedReason?: string | null; reportedAt?: string;
  requestId?: string; requestHash?: string; result?: TaskResult;
};
export function taskWorkflow(snapshot: Record<string, unknown>): TaskWorkflow {
  const value = snapshot.taskWorkflow;
  return value && typeof value === "object" && !Array.isArray(value) && (value as TaskWorkflow).version === 1 ? value as TaskWorkflow : { version: 1 };
}

export function nextTaskVersion(previous: string, now = Date.now()): string {
  return new Date(Math.max(now, Date.parse(previous) + 1)).toISOString();
}
