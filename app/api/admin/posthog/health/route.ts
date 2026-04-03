import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../../_lib/cache";
import { fetchPostHogHealth } from "@/lib/admin-posthog";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    const getData = createCachedFetcher(
      "posthog-health",
      () => fetchPostHogHealth(),
      CACHE_TTL.POSTHOG,
    );
    const data = await getData();
    return Response.json(
      { data },
      {
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Authorization",
        },
      },
    );
  } catch (error) {
    Sentry.captureException(error);
    const message =
      error instanceof Error ? error.message : "PostHog 상태를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Authorization",
        },
      },
    );
  }
}
