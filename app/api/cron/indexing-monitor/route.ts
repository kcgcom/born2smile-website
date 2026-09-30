import * as Sentry from "@sentry/nextjs";
import {
  isValidCronAuthorization,
  runIndexingMonitor,
  shouldAlertRunFailures,
} from "@/lib/admin-indexing-monitor";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isValidCronAuthorization(process.env.CRON_SECRET, request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await runIndexingMonitor();
    if (!data.skipped && shouldAlertRunFailures(data.succeeded, data.failed)) {
      Sentry.captureMessage("Search Console URL 검사가 다수 실패했습니다.", {
        level: "warning",
        extra: { ...data },
      });
    }
    if (data.confirmedRegressions > 0 || data.confirmedCanonicalMismatches > 0) {
      Sentry.captureMessage("Search Console 색인 상태 악화가 확인되었습니다.", {
        level: "warning",
        extra: { ...data },
      });
    }
    return Response.json({ data });
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "색인 상태 검사에 실패했습니다";
    return Response.json(
      { error: "INDEXING_MONITOR_FAILED", message },
      { status: 500 },
    );
  }
}
