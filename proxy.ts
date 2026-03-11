import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ALL_CATEGORY_SLUGS } from "@/lib/blog/category-slugs";

const RESERVED_BLOG_SEGMENTS = new Set([...ALL_CATEGORY_SLUGS, "redirect"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/blog/")) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);

  // Legacy blog URLs used the format /blog/[slug].
  // Rewrite them to /blog/redirect/[slug] so the App Router can resolve
  // the canonical category-based URL without conflicting with /blog/[category].
  if (segments.length === 2) {
    const legacySlug = segments[1];

    if (!RESERVED_BLOG_SEGMENTS.has(legacySlug)) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/blog/redirect/${legacySlug}`;
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/blog/:path*"],
};
