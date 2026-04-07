import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { isAiOpsRemoteEnabled, proxyAiOpsJson } from "../_lib/proxy";
import { getAiOpsOpportunities } from "@/lib/admin-ai-ops";
import type { AiOpsOpportunityListResponse } from "@/lib/admin-ai-ops-types";

const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
} as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const period = request.nextUrl.searchParams.get("period");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "18");

  try {
    const data = isAiOpsRemoteEnabled()
      ? (await proxyAiOpsJson<AiOpsOpportunityListResponse>({
          path: "/ai-ops/opportunities",
          request,
          adminEmail: auth.email,
        })).data
      : await getAiOpsOpportunities(period === "60d" ? "60d" : period === "14d" || period === "7d" ? "14d" : "30d", limit);

    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "운영 기회 목록을 불러올 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
