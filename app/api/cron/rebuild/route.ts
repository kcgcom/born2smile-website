import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { submitIndexNowUrls } from "@/lib/indexnow";
import { BASE_URL } from "@/lib/constants";
import { getCategorySlug } from "@/lib/blog";
import { getTodayKST } from "@/lib/date";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/blog", "layout");
  const today = getTodayKST();

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("blog_posts")
      .select("slug, category")
      .eq("published", true)
      .eq("date", today);

    if (error) throw error;

    const urls = (data ?? []).flatMap((post) => [
      `${BASE_URL}/blog/${getCategorySlug(post.category)}/${post.slug}`,
      `${BASE_URL}/blog`,
      `${BASE_URL}/sitemap.xml`,
    ]);

    await submitIndexNowUrls(urls);
  } catch (error) {
    console.error("[indexnow] cron submit failed:", error);
  }

  return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() });
}
