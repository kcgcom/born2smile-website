import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { isAiOpsRemoteEnabled, proxyAiOpsJson } from "../_lib/proxy";
import { aiOpsSuggestionRequestSchema } from "@/lib/blog-validation";
import { createAiSuggestionJob, processAiSuggestionJob } from "@/lib/admin-ai-ops-jobs";
import type { AiOpsSuggestionJob } from "@/lib/admin-ai-ops-types";

export const runtime = "nodejs";
export const maxDuration = 60;

const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
} as const;

function shouldFallbackToLocalJob(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /404/.test(error.message) || /not found/i.test(error.message);
}

async function createAndRunLocalJob(input: {
  targetType: AiOpsSuggestionJob["targetType"];
  targetId: string;
  suggestionType: AiOpsSuggestionJob["suggestionType"];
  actorEmail: string;
  context?: string;
}) {
  const job = await createAiSuggestionJob(input);

  void processAiSuggestionJob(job.id, input).catch((error) => {
    Sentry.captureException(error);
  });

  return job;
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
    if (isAiOpsRemoteEnabled()) {
      try {
        const data = (await proxyAiOpsJson<AiOpsSuggestionJob>({
          path: "/ai-ops/suggestion-jobs",
          method: "POST",
          adminEmail: auth.email,
          timeoutMs: 10_000,
          body: {
            ...parsed.data,
            actor_email: auth.email,
          },
        })).data;

        return Response.json({ data }, { status: 202, headers: HEADERS });
      } catch (error) {
        if (!shouldFallbackToLocalJob(error)) {
          throw error;
        }

        console.warn("[ai-ops] remote suggestion-jobs endpoint unavailable, falling back to local job runner");
      }
    }

    const job = await createAndRunLocalJob({
      ...parsed.data,
      actorEmail: auth.email,
    });

    return Response.json({ data: job }, { status: 202, headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: error instanceof Error ? error.message : "운영 제안 잡을 생성할 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
