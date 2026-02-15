import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "서울본치과 - 김포한강신도시 장기동 치과";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadGoogleFont(
  family: string,
  weight: number,
  text?: string
): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    display: "swap",
  });
  if (text) params.set("text", text);

  const css = await fetch(
    `https://fonts.googleapis.com/css2?${params.toString()}`,
    {
      headers: {
        // woff 형식을 받기 위한 User-Agent (Satori가 woff2 미지원)
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
      },
    }
  ).then((r) => r.text());

  const urlMatch = css.match(/src:\s*url\(([^)]+)\)/);
  if (!urlMatch?.[1]) {
    throw new Error(`Failed to load Google Font: ${family} ${weight}`);
  }

  return fetch(urlMatch[1]).then((r) => r.arrayBuffer());
}

// OG 이미지에 사용되는 모든 텍스트 (text= 파라미터로 필요한 글리프만 요청)
const KOREAN_TEXT =
  "서울본치과우리가족평생주치의꼭필요한료만오래편안하게김포강신도시장기동대출신통합학전문";
const LATIN_TEXT = "Seoul Born Dental Clinic 1833-7552 |";
const ALL_TEXT = KOREAN_TEXT + LATIN_TEXT;

export default async function OGImage() {
  const [serifBoldData, serifRegularData] = await Promise.all([
    loadGoogleFont("Noto Serif KR", 700, ALL_TEXT),
    loadGoogleFont("Noto Serif KR", 400, ALL_TEXT),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(145deg, #1E3A8A 0%, #2563EB 55%, #1D4ED8 100%)",
          position: "relative",
          fontFamily: "NotoSerifKR",
        }}
      >
        {/* 상단 골드 바 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background:
              "linear-gradient(90deg, #D4B869 0%, #C9962B 50%, #D4B869 100%)",
          }}
        />

        {/* 하단 골드 바 */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 5,
            background:
              "linear-gradient(90deg, #D4B869 0%, #C9962B 50%, #D4B869 100%)",
          }}
        />

        {/* 배경 장식 - 좌상단 원 */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: -80,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.03)",
          }}
        />

        {/* 배경 장식 - 우하단 원 */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            right: -100,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.03)",
          }}
        />

        {/* 메인 콘텐츠 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* 라벨 */}
          <div
            style={{
              color: "#C9962B",
              fontSize: 21,
              fontWeight: 400,
              letterSpacing: "0.25em",
              marginBottom: 20,
            }}
          >
            우리가족 평생주치의
          </div>

          {/* 병원명 */}
          <div
            style={{
              color: "white",
              fontSize: 82,
              fontWeight: 700,
              lineHeight: 1,
              marginBottom: 10,
            }}
          >
            서울본치과
          </div>

          {/* 영문명 */}
          <div
            style={{
              color: "rgba(255, 255, 255, 0.4)",
              fontSize: 17,
              fontWeight: 400,
              letterSpacing: "0.18em",
              marginBottom: 32,
            }}
          >
            Seoul Born Dental Clinic
          </div>

          {/* 골드 구분선 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 40,
                height: 1,
                background: "linear-gradient(90deg, transparent, #C9962B)",
              }}
            />
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#C9962B",
              }}
            />
            <div
              style={{
                width: 40,
                height: 1,
                background: "linear-gradient(90deg, #C9962B, transparent)",
              }}
            />
          </div>

          {/* 슬로건 */}
          <div
            style={{
              color: "#BFDBFE",
              fontSize: 30,
              fontWeight: 700,
              marginBottom: 40,
              letterSpacing: "0.02em",
            }}
          >
            꼭! 필요한 치료만, 오래오래 편안하게
          </div>

          {/* 정보 행 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              color: "#93C5FD",
              fontSize: 19,
              fontWeight: 400,
            }}
          >
            <span>김포한강신도시 장기동</span>
            <span
              style={{ color: "rgba(201, 150, 43, 0.6)", fontSize: 14 }}
            >
              |
            </span>
            <span>1833-7552</span>
            <span
              style={{ color: "rgba(201, 150, 43, 0.6)", fontSize: 14 }}
            >
              |
            </span>
            <span>서울대 출신 통합치의학전문의</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "NotoSerifKR",
          data: serifBoldData,
          weight: 700,
          style: "normal",
        },
        {
          name: "NotoSerifKR",
          data: serifRegularData,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );
}
