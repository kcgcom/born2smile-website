import { z } from "zod";

export const FEEDBACK_REASONS = {
  missing: "필요한 내용이 없어요",
  difficult: "설명이 어려워요",
  not_applicable: "제 상황에 적용하기 어려워요",
} as const;
export type FeedbackAnswer = "solved" | "unresolved";
export type FeedbackReason = keyof typeof FEEDBACK_REASONS;
export const feedbackSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/),
  visitorId: z.uuid(),
  answer: z.enum(["solved", "unresolved"]),
  reason: z.enum(["missing", "difficult", "not_applicable"]).nullable().default(null),
}).strict().refine(value => value.answer === "unresolved" || value.reason === null, { message: "해결된 응답에는 미해결 이유를 저장하지 않습니다." });

export type FeedbackInput = z.infer<typeof feedbackSchema>;
