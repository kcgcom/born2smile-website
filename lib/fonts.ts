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
  fallback: ["Georgia", "serif"],
});
