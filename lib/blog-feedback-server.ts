import { createHash } from "node:crypto";
import { feedbackSchema, type FeedbackInput } from "./blog/feedback";

export type FeedbackAuth = "visitor" | "admin" | "invalid" | "unavailable";
export async function classifyFeedbackAuth({ adminEmails, tokens, resolveToken, hasSessionCookie, resolveCookie, cliSecret }: {
  adminEmails: string[];
  tokens: string[];
  resolveToken: (token: string) => Promise<{ email?: string } | null>;
  hasSessionCookie: boolean;
  resolveCookie: () => Promise<{ email?: string } | null>;
  cliSecret?: string;
}): Promise<FeedbackAuth> {
  if (adminEmails.length === 0) return "unavailable";
  if (cliSecret && tokens.includes(cliSecret)) return "admin";
  try {
    const users = await Promise.all([
      ...tokens.map(resolveToken),
      ...(hasSessionCookie ? [resolveCookie()] : []),
    ]);
    if (users.some(user => user?.email && adminEmails.includes(user.email.toLowerCase()))) return "admin";
    if (users.some(user => !user)) return "invalid";
    return "visitor";
  } catch { return "unavailable"; }
}

export interface FeedbackDependencies {
  authenticate: (request: Request) => Promise<FeedbackAuth>;
  publicPost: (slug: string) => Promise<boolean>;
  save: (input: Omit<FeedbackInput, "visitorId"> & { visitorHash: string }) => Promise<{ id: string; updated_at: string }>;
}

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" };
export async function handleFeedback(request: Request, dependencies: FeedbackDependencies): Promise<Response> {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: HEADERS });
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "ORIGIN", message: "사이트에서 다시 시도해 주세요." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return reply({ error: "FORMAT" }, 415);
  // Browser hint can only suppress a response, never grant permission to store one.
  if (request.headers.get("x-admin-visitor") === "1") return reply({ ignored: true });
  try {
    const auth = await dependencies.authenticate(request);
    if (auth === "admin") return reply({ ignored: true });
    if (auth !== "visitor") return reply({ error: "AUTH", message: "인증 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." }, auth === "invalid" ? 401 : 503);
    if (Number(request.headers.get("content-length") ?? 0) > 2048) return reply({ error: "SIZE" }, 413);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "FORMAT" }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 2048) { await reader.cancel(); return reply({ error: "SIZE" }, 413); }
      chunks.push(chunk.value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    let body: unknown;
    try { body = JSON.parse(text); } catch { return reply({ error: "FORMAT" }, 400); }
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) return reply({ error: "INPUT", message: "응답을 다시 선택해 주세요." }, 400);
    const { visitorId, ...input } = parsed.data;
    if (!await dependencies.publicPost(input.slug)) return reply({ error: "NOT_FOUND" }, 404);
    const saved = await dependencies.save({ ...input, visitorHash: createHash("sha256").update(visitorId).digest("hex") });
    return reply({ data: { id: saved.id, updatedAt: saved.updated_at, answer: input.answer, reason: input.reason } });
  } catch {
    return reply({ error: "SAVE_FAILED", message: "응답을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}
