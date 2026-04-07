import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { isAiOpsRemoteEnabled, proxyAiOpsJson } from "../_lib/proxy";
import { getAiOpsPlaybooks } from "@/lib/admin-ai-ops";
import type { AiOpsPlaybook } from "@/lib/admin-ai-ops-types";

const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
} as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    const data = isAiOpsRemoteEnabled()
      ? (await proxyAiOpsJson<AiOpsPlaybook[]>({
          path: "/ai-ops/playbooks",
          request,
          adminEmail: auth.email,
        })).data
      : await getAiOpsPlaybooks();

    return Response.json({ data }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "플레이북 목록을 불러올 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
