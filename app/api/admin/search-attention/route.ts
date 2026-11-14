import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../_lib/cache";
import { fetchSearchAttention } from "@/lib/admin-search-console";
import { getTodayKST } from "@/lib/date";

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
  try {
    const now = new Date();
    const data = await createCachedFetcher(`search-attention-v1-${getTodayKST(now)}`, () => fetchSearchAttention(now), CACHE_TTL.SEARCH_CONSOLE)();
    return Response.json({ data }, { headers });
  } catch {
    return Response.json({ message: "검색 변화 데이터를 불러오지 못했습니다." }, { status: 503, headers });
  }
}
