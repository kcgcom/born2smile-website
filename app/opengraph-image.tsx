import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT_COLOR = "#C9962B";

export default function Image() {
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
            background: ACCENT_COLOR,
          }}
        />

        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
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
            서울본치과
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 28,
              fontFamily: "Pretendard",
              fontWeight: 400,
              marginTop: 20,
            }}
          >
            김포한강신도시 믿을 수 있는 치과
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
