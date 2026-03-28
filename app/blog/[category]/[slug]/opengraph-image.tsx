import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { BLOG_CATEGORY_LABELS } from "@/lib/blog/category-slugs";
import type { BlogCategorySlug } from "@/lib/blog/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORY_COLORS: Record<string, string> = {
  prevention: "#2563EB",
  restorative: "#15803D",
  prosthetics: "#7C3AED",
  implant: "#E11D48",
  orthodontics: "#A67B1E",
  pediatric: "#EA580C",
  "health-tips": "#0F766E",
};

async function getPostTitle(slug: string): Promise<string | null> {
  try {
    const { BLOG_POSTS_SNAPSHOT } = await import("@/lib/blog/generated/posts-snapshot");
    const post = (BLOG_POSTS_SNAPSHOT as { slug: string; title: string }[]).find(
      (p) => p.slug === slug,
    );
    return post?.title ?? null;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const categoryLabel = BLOG_CATEGORY_LABELS[category as BlogCategorySlug] ?? category;
  const accentColor = CATEGORY_COLORS[category] ?? "#2563EB";

  const rawTitle = await getPostTitle(slug);
  const displayTitle = rawTitle
    ? rawTitle.length > 30
      ? rawTitle.slice(0, 28) + "..."
      : rawTitle
    : categoryLabel + " 정보 · 서울본치과";
  const fontSize = rawTitle && rawTitle.length <= 18 ? 64 : 54;

  const fontData400 = readFileSync(
    join(process.cwd(), "public/fonts/Pretendard-400.ttf"),
  );
  const fontData700 = readFileSync(
    join(process.cwd(), "public/fonts/Pretendard-700.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0D1B2A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 80px",
          position: "relative",
        }}
      >
        {/* Accent top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: accentColor,
          }}
        />

        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#C9962B",
              }}
            />
            <span
              style={{
                color: "#C9962B",
                fontSize: 18,
                fontFamily: "Pretendard",
                fontWeight: 400,
              }}
            >
              서울본치과 · 블로그
            </span>
          </div>
          <div
            style={{
              background: accentColor,
              color: "#ffffff",
              borderRadius: 100,
              padding: "8px 20px",
              fontSize: 16,
              fontFamily: "Pretendard",
              fontWeight: 400,
            }}
          >
            {categoryLabel}
          </div>
        </div>

        {/* Middle */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: fontSize,
              fontFamily: "Pretendard",
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {displayTitle}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 24,
              fontFamily: "Pretendard",
              fontWeight: 400,
              marginTop: 20,
            }}
          >
            서울본치과 블로그
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            color: "rgba(255,255,255,0.25)",
            fontSize: 18,
            fontFamily: "Pretendard",
            fontWeight: 400,
          }}
        >
          www.born2smile.co.kr
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Pretendard",
          data: fontData400,
          weight: 400,
        },
        {
          name: "Pretendard",
          data: fontData700,
          weight: 700,
        },
      ],
    },
  );
}
