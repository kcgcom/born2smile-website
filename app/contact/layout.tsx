import type { Metadata } from "next";
import { CLINIC, BASE_URL } from "@/lib/constants";
import { getBreadcrumbJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { getSiteClinic, getSiteHours } from "@/lib/site-config-firestore";

export const metadata: Metadata = {
  title: "상담 안내",
  description: `${CLINIC.name} 전화 상담 안내. 대표전화 ${CLINIC.phone}. ${CLINIC.address}. 김포한강신도시 장기동 치과 예약.`,
  keywords: ["김포치과 예약", "김포한강신도시 치과 상담", "장기동 치과 전화", "서울본치과 상담"],
  alternates: { canonical: `${BASE_URL}/contact` },
};

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
        hoursAvailable: hours.schedule
          .filter((h) => h.open)
          .map((h) => {
            const dayMap: Record<string, string> = {
              월요일: "Monday",
              화요일: "Tuesday",
              수요일: "Wednesday",
              목요일: "Thursday",
              금요일: "Friday",
              토요일: "Saturday",
            };
            const [open, close] = h.time.split(" - ");
            return {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: dayMap[h.day],
              opens: open,
              closes: close,
            };
          }),
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
