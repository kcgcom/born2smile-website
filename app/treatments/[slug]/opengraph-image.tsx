import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { TREATMENTS } from "@/lib/constants";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return TREATMENTS.map((t) => ({ slug: t.id }));
}

const TREATMENT_COLORS: Record<string, string> = {
  implant: "#E11D48",
  orthodontics: "#A67B1E",
  prosthetics: "#7C3AED",
  pediatric: "#EA580C",
  restorative: "#15803D",
  scaling: "#2563EB",
};

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const treatment = TREATMENTS.find((t) => t.id === slug);
  const treatmentName = treatment?.name ?? "진료 안내";
  const treatmentShortDesc = treatment?.shortDesc ?? "서울본치과 전문 진료";
  const accentColor = TREATMENT_COLORS[slug] ?? "#2563EB";

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
              서울본치과 · SEOUL BORN DENTAL
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
            진료 안내
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
              fontSize: 72,
              fontFamily: "Pretendard",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {"김포 " + treatmentName}
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
            {treatmentShortDesc}
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
