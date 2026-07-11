import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../../_lib/cache";
import { fetchPostHogConversion, POSTHOG_PERIODS, type PostHogPeriod } from "@/lib/admin-posthog";

const POSTHOG_CACHE_TTL: Record<PostHogPeriod, number> = {
  "7d": CACHE_TTL.POSTHOG,
  "30d": 600,
  "90d": 1800,
  "180d": 3600,
};

class PartialPostHogResultError extends Error {
  constructor(readonly data: Awaited<ReturnType<typeof fetchPostHogConversion>>) {
    super("PostHog 상세 데이터 일부 조회 실패");
    this.name = "PartialPostHogResultError";
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const period = (request.nextUrl.searchParams.get("period") ?? "7d") as PostHogPeriod;
  const force = request.nextUrl.searchParams.get("force") === "true";
  if (!POSTHOG_PERIODS.includes(period)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (7d, 30d, 90d, 180d)" },
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
    const cacheTtlSeconds = POSTHOG_CACHE_TTL[period];
    const getData = createCachedFetcher(
      `posthog-conversion-${period}`,
      async () => {
        const result = await fetchPostHogConversion(period);
        if (result.warnings.length > 0) throw new PartialPostHogResultError(result);
        return result;
      },
      cacheTtlSeconds,
    );
    let data: Awaited<ReturnType<typeof fetchPostHogConversion>>;
    if (force) {
      data = await fetchPostHogConversion(period);
    } else {
      try {
        data = await getData();
      } catch (error) {
        if (!(error instanceof PartialPostHogResultError)) throw error;
        data = error.data;
      }
    }
    if (data.warnings.length > 0) {
      Sentry.captureMessage("PostHog 전환 상세 데이터 일부 조회 실패", {
        level: "warning",
        tags: { period, partial: "true" },
        extra: { warnings: data.warnings },
      });
    }
    return Response.json(
      {
        data: {
          ...data,
          meta: { ...data.meta, cacheTtlSeconds },
        },
      },
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
