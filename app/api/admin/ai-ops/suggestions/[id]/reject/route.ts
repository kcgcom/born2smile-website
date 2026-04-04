import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../../../_lib/auth";
import { proxyAiOpsJson, isAiOpsRemoteEnabled } from "../../../_lib/proxy";
import { rejectAiSuggestion } from "@/lib/admin-ai-ops";
import { aiOpsSuggestionActionSchema } from "@/lib/blog-validation";
import type { AiOpsSuggestionListItem } from "@/lib/admin-ai-ops-types";

const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { id } = await params;
  const suggestionId = Number(id);
  if (!Number.isInteger(suggestionId) || suggestionId < 1) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효한 제안 ID가 아닙니다" },
      { status: 400, headers: HEADERS },
    );
  }

  let body: unknown = {};
  try {
    const raw = await request.text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return Response.json(
      { error: "BAD_REQUEST", message: "요청 본문을 파싱할 수 없습니다" },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = aiOpsSuggestionActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", message: "반려 요청 형식이 올바르지 않습니다", issues: parsed.error.issues },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const data = isAiOpsRemoteEnabled()
      ? (await proxyAiOpsJson<AiOpsSuggestionListItem>({
          path: `/ai-ops/suggestions/${suggestionId}/reject`,
          method: "POST",
          adminEmail: auth.email,
          body: {
            actor_email: auth.email,
            note: parsed.data.note,
          },
        })).data
      : await rejectAiSuggestion({ id: suggestionId, actorEmail: auth.email, note: parsed.data.note });

    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: error instanceof Error ? error.message : "제안을 반려할 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
