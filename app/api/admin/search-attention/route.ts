import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../_lib/cache";
import { fetchSearchAttention } from "@/lib/admin-search-console";
import { getLatestFinalSearchDate } from "../_lib/search-console-cache";

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
  try {
    const now = new Date();
    const end = process.env.SEARCH_CONSOLE_SITE_URL?.trim() ? await getLatestFinalSearchDate(now) : null;
    const data = end
      ? await createCachedFetcher(`search-attention-v2-${end}`, () => fetchSearchAttention(now, end), CACHE_TTL.SEARCH_CONSOLE)()
      : await fetchSearchAttention(now);
    return Response.json({ data }, { headers });
  } catch {
    return Response.json({ message: "검색 변화 데이터를 불러오지 못했습니다." }, { status: 503, headers });
  }
}
