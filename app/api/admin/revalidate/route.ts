import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { revalidateBlogCaches } from "../_lib/blog-cache";
import { getPostBySlugFresh } from "@/lib/blog-supabase";

const HEADERS = { "Cache-Control": "private, no-store" } as const;

/**
 * POST /api/admin/revalidate
 * 블로그 관련 캐시를 수동으로 강제 무효화합니다.
 * Supabase 데이터를 직접 수정한 후 캐시가 갱신되지 않을 때 사용합니다.
 *
 * body.slug 가 있으면 해당 포스트 기준으로 정밀 무효화하고,
 * 없으면 기존처럼 블로그 전체 캐시를 무효화합니다.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  let slug: string | null = null;
  try {
    const body = await request.json();
    if (body && typeof body.slug === "string" && body.slug.trim().length > 0) {
      slug = body.slug.trim();
    }
  } catch {
    // body 없는 POST 요청은 전체 무효화로 처리
  }

  if (slug) {
    const post = await getPostBySlugFresh(slug);
    if (!post) {
      return Response.json(
        { error: "NOT_FOUND", message: `포스트를 찾을 수 없습니다: ${slug}` },
        { status: 404, headers: HEADERS },
      );
    }

    revalidateBlogCaches({ slug, category: post.category });

    return Response.json(
      {
        data: {
          revalidated: true,
          mode: "targeted",
          slug,
          category: post.category,
          timestamp: new Date().toISOString(),
        },
      },
      { headers: HEADERS },
    );
  }

  revalidateBlogCaches();

  return Response.json(
    { data: { revalidated: true, mode: "all", timestamp: new Date().toISOString() } },
    { headers: HEADERS },
  );
}
