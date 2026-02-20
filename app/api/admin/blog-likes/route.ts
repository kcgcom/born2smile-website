import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../_lib/cache";
import { getAdminApp } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

interface BlogLikesResponse {
  likes: Record<string, number>;
  totalLikes: number;
  updatedAt: string;
}

async function fetchBlogLikes(): Promise<BlogLikesResponse> {
  const db = getFirestore(getAdminApp());
  const snapshot = await db.collection("blog-likes").get();

  const likes: Record<string, number> = {};
  let totalLikes = 0;

  for (const doc of snapshot.docs) {
    const count = (doc.data().count as number) ?? 0;
    likes[doc.id] = count;
    totalLikes += count;
  }

  const updatedAt = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "+09:00");

  return { likes, totalLikes, updatedAt };
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    const getData = createCachedFetcher(
      "blog-likes",
      fetchBlogLikes,
      CACHE_TTL.BLOG_LIKES,
    );
    const data = await getData();
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json(
      { error: "API_ERROR", message: "좋아요 데이터를 불러올 수 없습니다" },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
