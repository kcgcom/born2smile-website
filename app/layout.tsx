import type { Metadata } from "next";
import { pretendard, notoSerifKR, maruBuri } from "@/lib/fonts";
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
      className={`${pretendard.variable} ${notoSerifKR.variable} ${maruBuri.variable}`}
    >
      <head>
        <meta name="theme-color" content="#2563EB" />
        {/* 카카오톡 등 인앱 브라우저의 시스템 텍스트 스케일링 보정 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement,t=document.createElement("div");t.style.cssText="position:absolute;visibility:hidden;font-size:16px";d.appendChild(t);var a=parseFloat(getComputedStyle(t).fontSize);d.removeChild(t);if(Math.abs(a-16)>.5)d.style.fontSize=(16/a*100)+"%"})();`,
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
