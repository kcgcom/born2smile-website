import { z } from "zod/v4";

export const plannerItemTypes = ["blog", "page", "faq"] as const;
export const plannerStatuses = [
  "approved",
  "in_progress",
  "review",
  "scheduled",
  "published",
  "deferred",
  "dismissed",
] as const;
export const plannerPriorities = ["now", "next", "watch"] as const;

export type PlannerItemType = (typeof plannerItemTypes)[number];
export type PlannerStatus = (typeof plannerStatuses)[number];
export type PlannerPriority = (typeof plannerPriorities)[number];

export interface ContentPlannerItem {
  id: string;
  opportunityKey: string;
  itemType: PlannerItemType;
  title: string;
  category: string;
  targetPage: string;
  status: PlannerStatus;
  priority: PlannerPriority;
  rationale: string;
  brief: Record<string, unknown>;
  sourceSnapshot: Record<string, unknown>;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const createPlannerItemSchema = z.object({
  opportunityKey: z.string().min(3).max(240),
  itemType: z.enum(plannerItemTypes),
  title: z.string().min(2).max(160),
  category: z.string().min(1).max(80),
  targetPage: z.string().min(1).max(500),
  status: z.enum(plannerStatuses).default("approved"),
  priority: z.enum(plannerPriorities).default("now"),
  rationale: z.string().max(1000).default(""),
  brief: z.record(z.string(), z.unknown()).default({}),
  sourceSnapshot: z.record(z.string(), z.unknown()).default({}),
  dueDate: z.iso.date().nullable().default(null),
});

export const updatePlannerItemSchema = z.object({
  status: z.enum(plannerStatuses).optional(),
  priority: z.enum(plannerPriorities).optional(),
  dueDate: z.iso.date().nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "수정할 값이 없습니다");

interface PlannerRow {
  id: string;
  opportunity_key: string;
  item_type: PlannerItemType;
  title: string;
  category: string;
  target_page: string;
  status: PlannerStatus;
  priority: PlannerPriority;
  rationale: string;
  brief: Record<string, unknown> | null;
  source_snapshot: Record<string, unknown> | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function mapPlannerRow(row: PlannerRow): ContentPlannerItem {
  return {
    id: row.id,
    opportunityKey: row.opportunity_key,
    itemType: row.item_type,
    title: row.title,
    category: row.category,
    targetPage: row.target_page,
    status: row.status,
    priority: row.priority,
    rationale: row.rationale,
    brief: row.brief ?? {},
    sourceSnapshot: row.source_snapshot ?? {},
    dueDate: row.due_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
