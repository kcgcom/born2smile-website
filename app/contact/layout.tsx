import type { Metadata } from "next";
import { getOpeningHoursJsonLd } from "@/lib/opening-hours-jsonld";
import { BASE_URL } from "@/lib/constants";
import { getBreadcrumbJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { getSiteClinic, getSiteHours } from "@/lib/site-config-supabase";

export async function generateMetadata(): Promise<Metadata> {
  const clinic = await getSiteClinic();
  return {
    title: "상담 안내",
    description: `${clinic.name} 상담 안내 페이지입니다. 대표전화 ${clinic.phone}, ${clinic.address}. 요일별 진료시간과 점심시간, 카카오맵 길찾기, 첫 내원 전 준비사항과 예약 문의 방법을 빠르게 확인해 상담을 시작하실 수 있습니다. 체크포인트도 함께 안내합니다.`,
    keywords: ["김포치과 예약", "김포한강신도시 치과 상담", "장기동 치과 전화", "서울본치과 상담"],
    alternates: { canonical: `${BASE_URL}/contact` },
    openGraph: {
      title: `상담 안내 | ${clinic.name}`,
      description: `대표전화, 진료시간, 길찾기와 첫 내원 전 확인할 내용을 ${clinic.name} 상담 안내 페이지에서 확인하세요.`,
      siteName: clinic.name,
      locale: "ko_KR",
      type: "website",
      url: `${BASE_URL}/contact`,
      images: [
        {
          url: "/images/facility/exterior.jpg",
          alt: `${clinic.name} 오시는 길 안내`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `상담 안내 | ${clinic.name}`,
      description: `대표전화, 진료시간, 길찾기와 첫 내원 전 확인할 내용을 ${clinic.name} 상담 안내 페이지에서 확인하세요.`,
      images: ["/images/facility/exterior.jpg"],
    },
  };
}

function getContactJsonLd(
  clinic: Awaited<ReturnType<typeof getSiteClinic>>,
  hours: Awaited<ReturnType<typeof getSiteHours>>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `상담 안내 | ${clinic.name}`,
    description: `${clinic.name} 전화 상담 안내`,
    url: `${BASE_URL}/contact`,
    mainEntity: {
      "@type": "Dentist",
      "@id": `${BASE_URL}/#organization`,
      ...getOpeningHoursJsonLd(hours),
      name: clinic.name,
      telephone: clinic.phoneIntl,
      address: {
        "@type": "PostalAddress",
        streetAddress: clinic.addressShort,
        addressLocality: "김포시 장기동",
        addressRegion: "경기도",
        addressCountry: "KR",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: clinic.phoneIntl,
        contactType: "예약 및 상담",
        availableLanguage: "Korean",
      },
    },
  };
}
export default async function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [clinic, hours] = await Promise.all([getSiteClinic(), getSiteHours()]);
  const contactJsonLd = getContactJsonLd(clinic, hours);
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "상담 안내", href: "/contact" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(contactJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}
