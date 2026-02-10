import type { Metadata } from "next";
import { pretendard, notoSerifKR } from "@/lib/fonts";
import { SEO, CLINIC } from "@/lib/constants";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingCTA } from "@/components/layout/FloatingCTA";
import "./globals.css";

export const metadata: Metadata = {
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
        <Header />
        <main>{children}</main>
        <Footer />
        <FloatingCTA />
      </body>
    </html>
  );
}
