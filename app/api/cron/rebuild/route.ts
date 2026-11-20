import { isValidCronAuthorization } from "@/lib/cron-auth";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { revalidateBlogCaches } from "../../admin/_lib/blog-cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runIndexNowSubmission } from "@/lib/indexnow";
import { BASE_URL } from "@/lib/constants";
import { getCategorySlug } from "@/lib/blog";
import { getTodayKST } from "@/lib/date";

export async function GET(request: Request) {
  if (!isValidCronAuthorization(process.env.CRON_SECRET, request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getTodayKST();
  let urls: string[] = [];
  let postSlugs: string[] = [];

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("blog_posts")
      .select("slug, category")
      .eq("published", true)
      .eq("date", today);

    if (error) throw error;
    postSlugs = (data ?? []).map((post) => post.slug);

    revalidateBlogCaches((data ?? []).map((post) => ({
      slug: post.slug,
      category: post.category,
    })));

    urls = (data ?? []).flatMap((post) => [
      `${BASE_URL}/blog/${getCategorySlug(post.category)}/${post.slug}`,
      `${BASE_URL}/blog/${getCategorySlug(post.category)}`,
      `${BASE_URL}/blog`,
      `${BASE_URL}/sitemap.xml`,
    ]);

  } catch (error) {
    Sentry.captureException(error);
    console.error("[cron] blog rebuild failed:", error);
    return NextResponse.json(
      {
        revalidated: false,
        indexNowOk: false,
        error: "예약 발행 캐시를 갱신할 수 없습니다",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }

  const indexNow = await runIndexNowSubmission("scheduled", urls, postSlugs);
  return NextResponse.json({
    revalidated: true,
    indexNowOk: indexNow.status === "accepted" || indexNow.status === "pending_validation",
    indexNow,
    ...(indexNow.status === "failed" && { warning: "캐시는 갱신했지만 IndexNow 제출에 실패했습니다" }),
    timestamp: new Date().toISOString(),
  });
}
