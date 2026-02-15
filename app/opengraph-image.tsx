import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "서울본치과 - 김포한강신도시 장기동 치과";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// OG 이미지에 사용되는 모든 텍스트 (Google Fonts text= 파라미터로 필요한 글리프만 요청)
const ALL_TEXT =
  "서울본치과우리가족평생주치의꼭필요한료만오래편안하게김포강신도시장기동대출신통합학전문" +
  "Seoul Born Dental Clinic 1833-7552 |!,.";

type FontStyle = "normal" | "italic";
type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type FontEntry = {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: FontStyle;
};

// Google Fonts 방식: 하나의 폰트 파일에 필요한 글리프만 포함
const GOOGLE_FONT_FAMILY = "NotoSerifKR";

async function loadGoogleFonts(): Promise<{
  fonts: FontEntry[];
  fontFamily: string;
}> {
  const fetchFont = async (weight: FontWeight): Promise<ArrayBuffer> => {
    const params = new URLSearchParams({
      family: `Noto Serif KR:wght@${weight}`,
      display: "swap",
      text: ALL_TEXT,
    });

    const css = await fetch(
      `https://fonts.googleapis.com/css2?${params.toString()}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
        },
      }
    ).then((r) => r.text());

    const urlMatch = css.match(/src:\s*url\(([^)]+)\)/);
    if (!urlMatch?.[1]) {
      throw new Error(
        `Failed to parse Google Font CSS for weight ${weight}`
      );
    }
    return fetch(urlMatch[1]).then((r) => r.arrayBuffer());
  };

  const [bold, regular] = await Promise.all([
    fetchFont(700),
    fetchFont(400),
  ]);
  return {
    fonts: [
      {
        name: GOOGLE_FONT_FAMILY,
        data: bold,
        weight: 700,
        style: "normal",
      },
      {
        name: GOOGLE_FONT_FAMILY,
        data: regular,
        weight: 400,
        style: "normal",
      },
    ],
    fontFamily: GOOGLE_FONT_FAMILY,
  };
}

// 로컬 @fontsource 서브셋 woff 파일에서 필요한 글리프만 로드 (Google Fonts 실패 시 폴백)
// 서브셋 113, 115, 116, 117, 118, 119가 OG 이미지에 사용되는 한국어+라틴 문자를 커버
// Satori는 동일 이름의 폰트 중 첫 번째만 사용하므로, 각 서브셋에 고유 이름을 부여하고
// fontFamily에 쉼표로 나열하여 글리프 폴백이 동작하도록 함
const FONT_SUBSETS = [119, 118, 117, 116, 115, 113]; // 글리프 수 많은 순

async function loadLocalFonts(): Promise<{
  fonts: FontEntry[];
  fontFamily: string;
}> {
  const fontsDir = join(
    process.cwd(),
    "node_modules/@fontsource/noto-serif-kr/files"
  );

  const loadSubset = async (
    n: number,
    weight: FontWeight
  ): Promise<ArrayBuffer> => {
    const buf = await readFile(
      join(fontsDir, `noto-serif-kr-${n}-${weight}-normal.woff`)
    );
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  };

  const entries: FontEntry[] = [];
  for (const n of FONT_SUBSETS) {
    for (const weight of [700, 400] as FontWeight[]) {
      entries.push({
        name: `Noto${n}`,
        data: await loadSubset(n, weight),
        weight,
        style: "normal",
      });
    }
  }

  const fontFamily = FONT_SUBSETS.map((n) => `Noto${n}`).join(", ");
  return { fonts: entries, fontFamily };
}

async function loadFonts(): Promise<{
  fonts: FontEntry[];
  fontFamily: string;
}> {
  try {
    return await loadGoogleFonts();
  } catch {
    return await loadLocalFonts();
  }
}

export default async function OGImage() {
  const { fonts, fontFamily } = await loadFonts();

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
          fontFamily,
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
    { ...size, fonts }
  );
}
