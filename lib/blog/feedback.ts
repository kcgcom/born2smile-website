import { z } from "zod";

export type FeedbackAnswer = "solved" | "unresolved";
export const feedbackSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/),
  visitorId: z.uuid(),
  answer: z.enum(["solved", "unresolved"]),
  // Retained for older clients; the current two-button UI omits this field.
  reason: z.enum(["missing", "difficult", "not_applicable"]).nullable().default(null),
}).strict().refine(value => value.answer === "unresolved" || value.reason === null, { message: "해결된 응답에는 미해결 이유를 저장하지 않습니다." });

export type FeedbackInput = z.infer<typeof feedbackSchema>;
