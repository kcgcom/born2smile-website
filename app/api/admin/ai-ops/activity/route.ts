import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { isAiOpsRemoteEnabled, proxyAiOpsJson } from "../_lib/proxy";
import { listAiActivity } from "@/lib/admin-ai-ops";
import type { AiOpsActivityItem } from "@/lib/admin-ai-ops-types";

const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
} as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "30");
  const limit = Number.isFinite(rawLimit) ? rawLimit : 30;

  try {
    let data: AiOpsActivityItem[];
    if (isAiOpsRemoteEnabled()) {
      try {
        data = (await proxyAiOpsJson<AiOpsActivityItem[]>({
          path: "/ai-ops/activity",
          request,
          adminEmail: auth.email,
        })).data;
      } catch (error) {
        console.warn("[ai-ops] remote activity failed, falling back to local", error);
        data = await listAiActivity(limit);
      }
    } else {
      data = await listAiActivity(limit);
    }

    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "활동 로그를 불러올 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
