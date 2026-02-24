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
  preload: false, // 468KiB 폰트 preload 제거 — 모바일 4G에서 CSS(15KiB)와 대역폭 경합 해소
  // font-display:swap + 유사 메트릭 시스템 폰트 폴백으로 FOUT 최소화
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
  preload: false, // 헤드라인 전용 — 초기 렌더링 크리티컬 패스에서 제외 (2MB 절약)
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
  display: "swap",
  preload: false, // 홈페이지 인사말에만 사용 — 비홈페이지에서 불필요한 프리로드 방지
  fallback: ["Georgia", "serif"],
});
