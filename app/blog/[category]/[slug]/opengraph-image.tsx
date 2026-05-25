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

function splitTitleLines(title: string): string[] {
  const compactTitle = title.trim();
  if (!compactTitle) return [];

  const preferredBreaks = [", ", "·", ":", " - ", " — "];
  for (const separator of preferredBreaks) {
    if (!compactTitle.includes(separator)) continue;
    const parts = compactTitle
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const [first, ...rest] = parts;
      return [first + separator.trimEnd(), rest.join(" ")].filter(Boolean);
    }
  }

  if (compactTitle.length <= 16) return [compactTitle];

  const middle = Math.floor(compactTitle.length / 2);
  let splitIndex = -1;
  for (let offset = 0; offset < 6; offset += 1) {
    const rightIndex = middle + offset;
    const leftIndex = middle - offset;
    if (compactTitle[rightIndex] === " ") {
      splitIndex = rightIndex;
      break;
    }
    if (compactTitle[leftIndex] === " ") {
      splitIndex = leftIndex;
      break;
    }
  }

  if (splitIndex > 0) {
    return [
      compactTitle.slice(0, splitIndex).trim(),
      compactTitle.slice(splitIndex + 1).trim(),
    ].filter(Boolean);
  }

  return [compactTitle];
}

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
  const titleLines = splitTitleLines(displayTitle);
  const fontSize =
    rawTitle && rawTitle.length <= 14
      ? 62
      : rawTitle && rawTitle.length <= 24
        ? 54
        : 48;

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
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 72px",
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

        {/* Center content: keep key text inside the square-safe crop area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            maxWidth: 620,
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
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
            <div
              style={{
                background: accentColor,
                color: "#ffffff",
                borderRadius: 999,
                padding: "8px 18px",
                fontSize: 16,
                fontFamily: "Pretendard",
                fontWeight: 500,
                marginLeft: 8,
              }}
            >
              {categoryLabel}
            </div>
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: fontSize,
              fontFamily: "Pretendard",
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: "-0.03em",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              textWrap: "balance",
            }}
          >
            {titleLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 22,
              fontFamily: "Pretendard",
              fontWeight: 400,
              marginTop: 18,
            }}
          >
            서울본치과 블로그
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            color: "rgba(255,255,255,0.25)",
            fontSize: 16,
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
