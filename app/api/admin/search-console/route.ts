import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../_lib/cache";
import { fetchSearchConsoleData } from "@/lib/admin-search-console";

const VALID_PERIODS = ["7d", "28d", "90d"];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const period = request.nextUrl.searchParams.get("period") ?? "28d";
  if (!VALID_PERIODS.includes(period)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (7d, 28d, 90d)" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const getData = createCachedFetcher(
      `sc-${period}`,
      () => fetchSearchConsoleData(period),
      CACHE_TTL.SEARCH_CONSOLE,
    );
    const data = await getData();
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search Console 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
