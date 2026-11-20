import { fetchBusinessProfilePerformance, getBusinessProfileConfig } from "@/lib/admin-business-profile";
import { getTodayKST } from "@/lib/date";
import { unauthorizedResponse, verifyAdminRequest } from "../_lib/auth";
import { CACHE_TTL, createCachedFetcher } from "../_lib/cache";

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
  try {
    const config = getBusinessProfileConfig();
    if (!config) return Response.json({ data: { configured: false } }, { headers });
    const today = getTodayKST();
    const data = await createCachedFetcher(
      `business-profile-v1-${config.locationId}-${today}`,
      () => fetchBusinessProfilePerformance(config, today),
      CACHE_TTL.BUSINESS_PROFILE,
    )();
    return Response.json({ data }, { headers });
  } catch {
    return Response.json({ message: "구글 병원 프로필 성과를 불러오지 못했습니다." }, { status: 503, headers });
  }
}
