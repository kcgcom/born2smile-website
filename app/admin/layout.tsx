import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 루트 레이아웃의 Header/Footer/FloatingCTA를 관리자 영역에서 숨김 */}
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
