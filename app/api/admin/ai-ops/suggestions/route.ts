import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { getAiOpsSuggestionTimeoutMs, isAiOpsRemoteEnabled, proxyAiOpsJson } from "../_lib/proxy";
import { createAiSuggestion, listAiSuggestions } from "@/lib/admin-ai-ops";
import { aiOpsSuggestionRequestSchema } from "@/lib/blog-validation";
import type { AiOpsSuggestionListItem, AiOpsSuggestionStatus, AiOpsTargetType } from "@/lib/admin-ai-ops-types";

export const runtime = "nodejs";
export const maxDuration = 60;

const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
} as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const rawStatus = request.nextUrl.searchParams.get("status");
  const rawTargetType = request.nextUrl.searchParams.get("targetType");
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "50");

  const status: AiOpsSuggestionStatus | "all" =
    rawStatus === "draft" || rawStatus === "approved" || rawStatus === "rejected" || rawStatus === "applied"
      ? rawStatus
      : "all";
  const targetType: AiOpsTargetType | "all" =
    rawTargetType === "post" || rawTargetType === "page" || rawTargetType === "site"
      ? rawTargetType
      : "all";
  const limit = Number.isFinite(rawLimit) ? rawLimit : 50;

  try {
    let data: AiOpsSuggestionListItem[];
    if (isAiOpsRemoteEnabled()) {
      try {
        data = (await proxyAiOpsJson<AiOpsSuggestionListItem[]>({
          path: "/ai-ops/suggestions",
          request,
          adminEmail: auth.email,
        })).data;
      } catch (error) {
        console.warn("[ai-ops] remote suggestions failed, falling back to local", error);
        data = await listAiSuggestions({
          status,
          targetType,
          limit,
        });
      }
    } else {
      data = await listAiSuggestions({
        status,
        targetType,
        limit,
      });
    }

    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "운영 제안 목록을 불러올 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "BAD_REQUEST", message: "요청 본문을 파싱할 수 없습니다" },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = aiOpsSuggestionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", message: "운영 제안 요청 형식이 올바르지 않습니다", issues: parsed.error.issues },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const data = isAiOpsRemoteEnabled()
      ? (await proxyAiOpsJson<AiOpsSuggestionListItem>({
          path: "/ai-ops/suggestions",
          method: "POST",
          adminEmail: auth.email,
          timeoutMs: getAiOpsSuggestionTimeoutMs(),
          body: {
            ...parsed.data,
            actor_email: auth.email,
          },
        })).data
      : await createAiSuggestion({
          ...parsed.data,
          actorEmail: auth.email,
        });

    return Response.json({ data }, { status: 201, headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: error instanceof Error ? error.message : "운영 제안을 생성할 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
