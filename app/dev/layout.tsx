import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개발 대시보드 | 서울본치과",
  robots: { index: false, follow: false },
};

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 루트 레이아웃의 Header/Footer/FloatingCTA를 숨김 */}
      <style>{`
        body > header,
        body > footer,
        body > nav[aria-label="빠른 메뉴"],
        body > div.fixed.bottom-6 { display: none !important; }
        #main-content { padding-bottom: 0; }
      `}</style>
      {children}
    </>
  );
}
