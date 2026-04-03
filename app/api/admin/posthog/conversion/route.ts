import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../../_lib/cache";
import { fetchPostHogConversion, POSTHOG_PERIODS, type PostHogPeriod } from "@/lib/admin-posthog";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const period = (request.nextUrl.searchParams.get("period") ?? "7d") as PostHogPeriod;
  if (!POSTHOG_PERIODS.includes(period)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (7d, 30d, 90d)" },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Authorization",
        },
      },
    );
  }

  try {
    const getData = createCachedFetcher(
      `posthog-conversion-${period}`,
      () => fetchPostHogConversion(period),
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
      error instanceof Error ? error.message : "PostHog 전환 데이터를 불러올 수 없습니다";
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
