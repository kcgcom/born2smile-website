import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { isAiOpsRemoteEnabled, proxyAiOpsJson } from "../_lib/proxy";
import { getAiOpsBriefing } from "@/lib/admin-ai-ops";
import type { AiOpsBriefing, AiOpsBriefingPeriod } from "@/lib/admin-ai-ops-types";

const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
} as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const rawPeriod = request.nextUrl.searchParams.get("period");
  const period: AiOpsBriefingPeriod = rawPeriod === "60d"
    ? "60d"
    : rawPeriod === "14d" || rawPeriod === "7d"
      ? "14d"
      : "30d";

  try {
    let data: AiOpsBriefing;
    if (isAiOpsRemoteEnabled()) {
      try {
        data = (await proxyAiOpsJson<AiOpsBriefing>({
          path: "/ai-ops/briefing",
          request,
          adminEmail: auth.email,
        })).data;
      } catch (error) {
        console.warn("[ai-ops] remote briefing failed, falling back to local", error);
        data = await getAiOpsBriefing(period);
      }
    } else {
      data = await getAiOpsBriefing(period);
    }

    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "운영 브리핑을 불러올 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
