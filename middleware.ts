import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ALL_CATEGORY_SLUGS } from "@/lib/blog/category-slugs";

/**
 * 구형 블로그 URL 리다이렉트 미들웨어
 *
 * /blog/[slug] (구형) → /blog/redirect/[slug]로 내부 rewrite
 * /blog/redirect/[slug]/page.tsx에서 Firestore 조회 후 /blog/[category]/[slug]로 308 리다이렉트
 *
 * 카테고리 슬러그와 일치하는 요청은 카테고리 허브 페이지로 통과시킵니다.
 */

const CATEGORY_SLUGS = new Set(ALL_CATEGORY_SLUGS);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /blog/[single-segment] 패턴만 매칭 (하위 경로 제외)
  const match = pathname.match(/^\/blog\/([^/]+)$/);
  if (!match) return;

  const segment = match[1];

  // 카테고리 슬러그면 통과 (카테고리 허브 페이지로)
  if (CATEGORY_SLUGS.has(segment)) return;

  // "redirect" 세그먼트면 통과 (리다이렉트 라우트 자체)
  if (segment === "redirect") return;

  // 구형 포스트 URL → 리다이렉트 라우트로 내부 rewrite
  const url = request.nextUrl.clone();
  url.pathname = `/blog/redirect/${segment}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: "/blog/:path*",
};
