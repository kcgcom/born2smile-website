import * as Sentry from "@sentry/nextjs";
import {
  createSearchAdSyncJob,
  getSearchAdSyncState,
  runSearchAdSyncJob,
} from "@/lib/admin-searchad-snapshots";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await createSearchAdSyncJob("vercel-cron");
    if (state.status === "queued") await runSearchAdSyncJob(state.jobId!);
    return Response.json({ data: await getSearchAdSyncState() });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "ANALYSIS_SYNC_FAILED", message: "통합 분석 스냅샷 갱신에 실패했습니다." },
      { status: 500 },
    );
  }
}
