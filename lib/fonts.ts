import localFont from "next/font/local";
import { Maru_Buri } from "next/font/google";

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

export const maruBuri = Maru_Buri({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-maru-buri",
  display: "swap",
  fallback: ["Georgia", "serif"],
});
