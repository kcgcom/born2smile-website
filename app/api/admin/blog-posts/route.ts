import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import {
  getAllPostMetas,
  getPostBySlugFromFirestore,
  createBlogPost,
  type CreateBlogPostData,
} from "@/lib/blog-firestore";
import { blogPostSchema } from "@/lib/blog-validation";

const HEADERS = { "Cache-Control": "private, no-store" } as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    const posts = await getAllPostMetas();
    return Response.json({ data: posts }, { headers: HEADERS });
  } catch {
    return Response.json(
      { error: "API_ERROR", message: "블로그 포스트 목록을 불러올 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "BAD_REQUEST", message: "요청 본문을 파싱할 수 없습니다" },
      { status: 400, headers: HEADERS },
    );
  }

  let data: CreateBlogPostData;
  try {
    data = blogPostSchema.parse(body) as CreateBlogPostData;
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
    const existing = await getPostBySlugFromFirestore(data.slug);
    if (existing) {
      return Response.json(
        { error: "CONFLICT", message: `이미 존재하는 슬러그입니다: ${data.slug}` },
        { status: 409, headers: HEADERS },
      );
    }

    await createBlogPost(data, auth.email);

    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");

    return Response.json(
      { data: { slug: data.slug } },
      { status: 201, headers: HEADERS },
    );
  } catch {
    return Response.json(
      { error: "API_ERROR", message: "블로그 포스트를 생성할 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
