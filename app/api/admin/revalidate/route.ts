import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";

const HEADERS = { "Cache-Control": "private, no-store" } as const;

/**
 * POST /api/admin/revalidate
 * 블로그 관련 캐시를 수동으로 강제 무효화합니다.
 * Supabase 데이터를 직접 수정한 후 캐시가 갱신되지 않을 때 사용합니다.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  revalidateTag("blog-posts-admin");
  revalidateTag("blog-posts");
  revalidateTag("blog-slugs");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");

  return Response.json(
    { data: { revalidated: true, timestamp: new Date().toISOString() } },
    { headers: HEADERS },
  );
}
