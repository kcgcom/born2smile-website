import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import {
  getPostBySlug,
  updateBlogPost,
  deleteBlogPost,
  type UpdateBlogPostData,
} from "@/lib/blog-supabase";
import { blogPostUpdateSchema } from "@/lib/blog-validation";
import { getBlogPostUrl, getCategorySlug } from "@/lib/blog";
import { submitBlogPostToIndexNow } from "@/lib/indexnow";
import { getTodayKST } from "@/lib/date";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const HEADERS = { "Cache-Control": "private, no-store" } as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { slug } = await params;

  try {
    const post = await getPostBySlug(slug);
    if (!post) {
      return Response.json(
        { error: "NOT_FOUND", message: `포스트를 찾을 수 없습니다: ${slug}` },
        { status: 404, headers: HEADERS },
      );
    }
    return Response.json({ data: post }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "블로그 포스트를 불러올 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "BAD_REQUEST", message: "요청 본문을 파싱할 수 없습니다" },
      { status: 400, headers: HEADERS },
    );
  }

  let data: UpdateBlogPostData;
  try {
    data = blogPostUpdateSchema.parse(body) as UpdateBlogPostData;
  } catch (error) {
    const issues =
      error instanceof Error && "issues" in error
        ? (error as { issues: unknown[] }).issues
        : [];
    return Response.json(
      { error: "VALIDATION_ERROR", message: "입력값이 올바르지 않습니다", issues },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const existing = await getPostBySlug(slug);
    if (!existing) {
      return Response.json(
        { error: "NOT_FOUND", message: `포스트를 찾을 수 없습니다: ${slug}` },
        { status: 404, headers: HEADERS },
      );
    }

    const { data: existingMeta, error: existingMetaError } = await getSupabaseAdmin()
      .from("blog_posts")
      .select("published, date")
      .eq("slug", slug)
      .single();
    if (existingMetaError) throw existingMetaError;

    const todayKST = getTodayKST();
    const previousPublished = existingMeta?.published === true;
    const effectivePublished = data.published ?? previousPublished;
    const effectiveDate = data.date ?? existingMeta?.date ?? existing.date;
    const contentChanged = data.title !== undefined
      || data.subtitle !== undefined
      || data.excerpt !== undefined
      || data.category !== undefined
      || data.tags !== undefined
      || data.blocks !== undefined;
    const publishedAndDatedTodayOrPast = effectivePublished === true
      && effectiveDate <= todayKST;
    const updateData: UpdateBlogPostData = data.dateModified === undefined
      && contentChanged
      && publishedAndDatedTodayOrPast
      ? { ...data, dateModified: todayKST }
      : data;

    await updateBlogPost(slug, updateData, auth.email);

    // 카테고리 결정: 업데이트된 카테고리 또는 기존 카테고리
    const category = updateData.category ?? existing.category;
    revalidatePath("/blog");
    revalidatePath(getBlogPostUrl(slug, category));
    revalidatePath(`/blog/${getCategorySlug(category)}`);
    // 카테고리가 변경된 경우 이전 카테고리 허브도 무효화
    if (updateData.category && updateData.category !== existing.category) {
      revalidatePath(`/blog/${getCategorySlug(existing.category)}`);
    }
    revalidatePath("/sitemap.xml");
    revalidateTag("blog-posts-admin", "max");
    const becamePublished = !previousPublished && updateData.published === true;
    if (becamePublished || publishedAndDatedTodayOrPast) {
      void submitBlogPostToIndexNow(slug, category).catch((error) => {
        console.error("[indexnow] blog post submit failed:", error);
      });
    }

    return Response.json({ data: { slug } }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "블로그 포스트를 수정할 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { slug } = await params;

  try {
    const existing = await getPostBySlug(slug);
    if (!existing) {
      return Response.json(
        { error: "NOT_FOUND", message: `포스트를 찾을 수 없습니다: ${slug}` },
        { status: 404, headers: HEADERS },
      );
    }

    await deleteBlogPost(slug);

    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");
    revalidateTag("blog-posts-admin", "max");

    return Response.json({ data: { slug } }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "블로그 포스트를 삭제할 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
