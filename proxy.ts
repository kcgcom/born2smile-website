import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ALL_CATEGORY_SLUGS } from "@/lib/blog/category-slugs";
import { BLOG_POSTS_META } from "@/lib/blog/generated/posts-meta";

const RESERVED_BLOG_SEGMENTS = new Set([...ALL_CATEGORY_SLUGS, "redirect"]);

// 블로그 slug → category 정적 매핑 (Edge에서 즉시 조회)
const SLUG_TO_CATEGORY = new Map(
  BLOG_POSTS_META.map((p) => [p.slug, p.category]),
);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── 관리자 경로 보호 ───
  // /admin (login 제외) → Supabase 인증 쿠키 없으면 로그인으로 리다이렉트
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

    if (!hasAuthCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ─── 블로그 구형 URL 리다이렉트 ───
  if (pathname.startsWith("/blog/")) {
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 2) {
      const legacySlug = segments[1];

      if (!RESERVED_BLOG_SEGMENTS.has(legacySlug)) {
        // 정적 매핑에서 카테고리 조회 → Edge에서 즉시 301 리다이렉트
        const category = SLUG_TO_CATEGORY.get(legacySlug);
        if (category) {
          return NextResponse.redirect(
            new URL(`/blog/${category}/${legacySlug}`, request.url),
            301,
          );
        }

        // 매핑에 없는 slug → 서버사이드 폴백 (Supabase 조회)
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/blog/redirect/${legacySlug}`;
        return NextResponse.rewrite(rewriteUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/blog/:path*"],
};
