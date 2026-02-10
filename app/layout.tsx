import type { Metadata } from "next";
import { pretendard, notoSerifKR } from "@/lib/fonts";
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    siteName: CLINIC.name,
    locale: "ko_KR",
    type: "website",
    url: BASE_URL,
    images: [
      {
        url: SEO.ogImage,
        width: 1200,
        height: 630,
        alt: `${CLINIC.name} - ${CLINIC.slogan}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    images: [SEO.ogImage],
  },
  verification: {
    // TODO: 실제 인증 코드로 교체
    // google: "구글서치콘솔_인증코드",
    // other: { "naver-site-verification": "네이버서치어드바이저_인증코드" },
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
      className={`${pretendard.variable} ${notoSerifKR.variable}`}
    >
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
