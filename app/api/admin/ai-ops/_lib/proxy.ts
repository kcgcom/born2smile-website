import type { NextRequest } from "next/server";

const AI_OPS_AGENT_BASE_URL = process.env.AI_OPS_AGENT_BASE_URL?.trim().replace(/\/$/, "") ?? "";
const AI_OPS_AGENT_SHARED_SECRET = process.env.AI_OPS_AGENT_SHARED_SECRET?.trim() ?? "";
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_SUGGESTION_TIMEOUT_MS = 55_000;

function readTimeoutMs(raw: string | undefined, fallbackMs: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 5_000) {
    return fallbackMs;
  }

  return Math.min(parsed, 60_000);
}

function isTimeoutError(error: unknown) {
  return error instanceof Error
    && (error.name === "TimeoutError" || /aborted due to timeout/i.test(error.message));
}

export function isAiOpsRemoteEnabled() {
  return AI_OPS_AGENT_BASE_URL.length > 0;
}

export function getAiOpsSuggestionTimeoutMs() {
  return readTimeoutMs(process.env.AI_OPS_AGENT_SUGGESTION_TIMEOUT_MS, DEFAULT_SUGGESTION_TIMEOUT_MS);
}

export async function proxyAiOpsJson<T>(input: {
  path: string;
  method?: "GET" | "POST";
  request?: NextRequest;
  body?: unknown;
  adminEmail: string;
  timeoutMs?: number;
}): Promise<{ data: T; status: number }> {
  if (!isAiOpsRemoteEnabled()) {
    throw new Error("AI ops remote is not configured");
  }

  const url = new URL(`${AI_OPS_AGENT_BASE_URL}${input.path}`);
  if (input.request) {
    const sourceUrl = new URL(input.request.url);
    for (const [key, value] of sourceUrl.searchParams.entries()) {
      url.searchParams.set(toRemoteQueryKey(key), value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: input.method ?? (input.body === undefined ? "GET" : "POST"),
      headers: {
        ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(AI_OPS_AGENT_SHARED_SECRET ? { "X-AI-Ops-Secret": AI_OPS_AGENT_SHARED_SECRET } : {}),
        "X-Admin-Email": input.adminEmail,
      },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      signal: AbortSignal.timeout(input.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error("AI 운영 엔진 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요");
    }
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.message === "string"
      ? payload.message
      : `AI 운영 엔진 요청이 실패했습니다 (${response.status})`;
    throw new Error(message);
  }

  return {
    data: (payload.data ?? payload) as T,
    status: response.status,
  };
}

function toRemoteQueryKey(key: string) {
  switch (key) {
    case "targetType":
      return "target_type";
    default:
      return key;
  }
}
