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
      path: "../public/fonts/noto-serif-kr-korean-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/noto-serif-kr-korean-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-noto-serif",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const gowunBatang = localFont({
  src: [
    {
      path: "../public/fonts/gowun-batang-korean-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/gowun-batang-korean-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gowun-batang",
  display: "swap",
  preload: false, // 홈페이지 인사말에만 사용 — 비홈페이지에서 불필요한 프리로드 방지
  fallback: ["Georgia", "serif"],
});
