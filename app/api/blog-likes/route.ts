import { createCachedFetcher, CACHE_TTL } from "@/app/api/admin/_lib/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface BlogLikesResponse {
  likes: Record<string, number>;
  totalLikes: number;
  updatedAt: string;
}

async function fetchBlogLikes(): Promise<BlogLikesResponse> {
  const { data: rows, error } = await getSupabaseAdmin()
    .from("blog_likes")
    .select("slug, count");

  if (error) throw error;

  const likes: Record<string, number> = {};
  let totalLikes = 0;
  for (const row of rows ?? []) {
    likes[row.slug] = row.count;
    totalLikes += row.count;
  }

  const updatedAt = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "+09:00");

  return { likes, totalLikes, updatedAt };
}

export async function GET() {
  try {
    const getData = createCachedFetcher(
      "blog-likes",
      fetchBlogLikes,
      CACHE_TTL.BLOG_LIKES,
    );
    const data = await getData();
    return Response.json({ data }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } });
  } catch {
    return Response.json(
      { error: "API_ERROR", message: "좋아요 데이터를 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}
