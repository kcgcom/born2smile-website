import localFont from "next/font/local";

export const pretendard = localFont({
  src: [
    {
      path: "../public/fonts/PretendardVariable.woff2",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
  display: "swap",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "system-ui",
    "Roboto",
    "sans-serif",
  ],
});

export const notoSerifKR = localFont({
  src: [
    {
      path: "../public/fonts/noto-serif-kr-korean-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-noto-serif",
  display: "swap",
  // preload: true (기본값) — 히어로 h1(font-bold=700)의 FOUT 방지
  // 400 weight 제거: font-headline은 font-bold(700)만 사용하므로 불필요 (322KB 절약)
  fallback: ["Georgia", "serif"],
});

export const gowunBatang = localFont({
  src: [
    {
      path: "../public/fonts/gowun-batang-korean-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gowun-batang",
  display: "swap", // 폰트 로드까지 시스템 폰트 표시, 로드 후 전환 — optional은 느린 네트워크에서 영구 미표시
  preload: false, // 홈페이지 인사말에만 사용 — 비홈페이지에서 불필요한 프리로드 방지
  fallback: ["Georgia", "serif"],
});
