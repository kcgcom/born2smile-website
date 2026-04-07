import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { isAiOpsRemoteEnabled, proxyAiOpsJson } from "../_lib/proxy";
import { listAiOutcomes } from "@/lib/admin-ai-ops";
import type { AiOpsOutcomesResponse } from "@/lib/admin-ai-ops-types";

const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
} as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");

  try {
    const data = isAiOpsRemoteEnabled()
      ? (await proxyAiOpsJson<AiOpsOutcomesResponse>({
          path: "/ai-ops/outcomes",
          request,
          adminEmail: auth.email,
        })).data
      : await listAiOutcomes(limit);

    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "관측 신호를 불러올 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
