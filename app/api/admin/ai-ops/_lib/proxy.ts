import type { NextRequest } from "next/server";

const AI_OPS_AGENT_BASE_URL = process.env.AI_OPS_AGENT_BASE_URL?.trim().replace(/\/$/, "") ?? "";
const AI_OPS_AGENT_SHARED_SECRET = process.env.AI_OPS_AGENT_SHARED_SECRET?.trim() ?? "";
const DEFAULT_TIMEOUT_MS = 20_000;

export function isAiOpsRemoteEnabled() {
  return AI_OPS_AGENT_BASE_URL.length > 0;
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

  const response = await fetch(url, {
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
