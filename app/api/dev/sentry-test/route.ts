import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import {
  verifyAdminRequest,
  unauthorizedResponse,
} from "@/app/api/admin/_lib/auth";

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const now = new Date().toISOString();
  const error = new Error(`[sentry-test] 서버 테스트 이벤트 (${now})`);

  const eventId = Sentry.captureException(error, {
    level: "error",
    tags: {
      source: "admin-dev-sentry-test",
      runtime: "server",
    },
    extra: {
      triggeredBy: auth.email,
      timestamp: now,
      path: "/api/dev/sentry-test",
    },
  });

  await Sentry.flush(2000);

  return NextResponse.json(
    {
      data: {
        ok: true,
        eventId,
        timestamp: now,
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Authorization",
      },
    },
  );
}
