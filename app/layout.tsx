import type { Metadata } from "next";
import { pretendard, notoSerifKR, gowunBatang } from "@/lib/fonts";
import { SEO, CLINIC, BASE_URL } from "@/lib/constants";
import { getClinicJsonLd } from "@/lib/jsonld";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingCTA } from "@/components/layout/FloatingCTA";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: SEO.defaultTitle,
    template: SEO.titleTemplate,
  },
  description: SEO.defaultDescription,
  keywords: [...SEO.keywords],
  openGraph: {
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    siteName: CLINIC.name,
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: CLINIC.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    images: ["/images/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    other: { "naver-site-verification": "naverab813eb712958782be6b173969ecc817" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${notoSerifKR.variable} ${gowunBatang.variable}`}
    >
      <head>
        <meta name="theme-color" content="#2563EB" />
        {/* 카카오톡 등 인앱 브라우저의 Android WebView textZoom 보정 */}
        {/* textZoom은 CSS 적용 후 네이티브 레벨에서 폰트 크기를 곱하므로 JS로만 대응 가능 */}
        {/* 100px 기준 측정 → 줌 비율 감지 → html root font-size 역보정 (rem 기반 전체 적용) */}
        {/* 6중 타이밍: 즉시 + DOMContentLoaded + double-rAF + 100ms + 500ms + 2000ms */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var B=100;function m(){var d=document.documentElement,p=document.body||d,t=document.createElement("span");t.style.cssText="position:absolute!important;visibility:hidden!important;font-size:"+B+"px!important;line-height:normal!important;padding:0!important;margin:0!important;border:0!important;left:-9999px!important;top:0!important";p.appendChild(t);var s=parseFloat(getComputedStyle(t).fontSize);t.remove();return s}function f(){var r=m()/B;if(Math.abs(r-1)>0.01){document.documentElement.style.setProperty("font-size",(100/r)+"%","important")}}f();document.readyState==="loading"?document.addEventListener("DOMContentLoaded",f):f();typeof requestAnimationFrame!=="undefined"&&requestAnimationFrame(function(){requestAnimationFrame(f)});setTimeout(f,100);setTimeout(f,500);setTimeout(f,2000)})();`,
          }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getClinicJsonLd()),
          }}
        />
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <FloatingCTA />
      </body>
    </html>
  );
}
