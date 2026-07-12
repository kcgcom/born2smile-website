import { after, NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { unauthorizedResponse, verifyAdminRequest } from "../../_lib/auth";
import {
  createSearchAdSyncJob,
  getSearchAdSyncState,
  runSearchAdSyncJob,
} from "@/lib/admin-searchad-snapshots";

export const maxDuration = 300;

const HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" };

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    return Response.json({ data: await getSearchAdSyncState() }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "SYNC_STATUS_ERROR", message: "통합 데이터 갱신 상태를 확인할 수 없습니다." },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    const state = await createSearchAdSyncJob(auth.email);
    if (state.status === "queued") {
      after(async () => {
        try {
          await runSearchAdSyncJob(state.jobId!);
        } catch (error) {
          Sentry.captureException(error);
        }
      });
    }
    return Response.json({ data: state }, { status: 202, headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "통합 데이터 갱신을 시작할 수 없습니다.";
    return Response.json({ error: "SYNC_START_ERROR", message }, { status: 500, headers: HEADERS });
  }
}
