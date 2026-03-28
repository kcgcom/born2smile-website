import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { ALL_CATEGORY_SLUGS, BLOG_CATEGORY_LABELS } from "@/lib/blog/category-slugs";
import type { BlogCategorySlug } from "@/lib/blog/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return ALL_CATEGORY_SLUGS.map((category) => ({ category }));
}

const CATEGORY_COLORS: Record<string, string> = {
  prevention: "#2563EB",
  restorative: "#15803D",
  prosthetics: "#7C3AED",
  implant: "#E11D48",
  orthodontics: "#A67B1E",
  pediatric: "#EA580C",
  "health-tips": "#0F766E",
};

const CATEGORY_SUBTITLES: Record<BlogCategorySlug, string> = {
  prevention: "스케일링, 불소 도포, 구강 관리 가이드",
  restorative: "충치 치료, 신경 치료, 크라운 정보",
  prosthetics: "틀니, 라미네이트, 심미 보철 정보",
  implant: "임플란트 과정, 비용, 관리 가이드",
  orthodontics: "교정 종류, 기간, 관리 방법 안내",
  pediatric: "유아 구강 관리, 소아 치과 정보",
  "health-tips": "치과 건강 상식과 생활 속 구강 관리",
};

export default async function Image({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const slug = category as BlogCategorySlug;
  const categoryLabel = BLOG_CATEGORY_LABELS[slug] ?? category;
  const accentColor = CATEGORY_COLORS[slug] ?? "#2563EB";
  const subtitle = CATEGORY_SUBTITLES[slug] ?? "";

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
              fontSize: 80,
              fontFamily: "Pretendard",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {categoryLabel}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 26,
              fontFamily: "Pretendard",
              fontWeight: 400,
              marginTop: 20,
            }}
          >
            {subtitle}
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
          {"www.born2smile.co.kr/blog/" + category}
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
