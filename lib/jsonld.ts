import { BASE_URL, CLINIC, DOCTORS, HOURS, TREATMENTS } from "./constants";

/**
 * 치과의원 메인 JSON-LD (Dentist + LocalBusiness)
 * Google/네이버 검색 결과에 병원 정보, 진료시간, 연락처 등이 표시됩니다.
 */
export function getClinicJsonLd() {
  const doctor = DOCTORS[0];

  return {
    "@context": "https://schema.org",
    "@type": ["Dentist", "MedicalBusiness"],
    name: CLINIC.name,
    alternateName: CLINIC.nameEn,
    description: `김포한강신도시 장기동 ${CLINIC.name}. 김포한강신도시 장기동 치과. ${doctor.position}. 임플란트, 치아교정, 심미보철, 소아치료, 보존치료, 스케일링.`,
    url: BASE_URL,
    telephone: CLINIC.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "태장로 820, 엠프라자 2층 (장기동)",
      addressLocality: "김포시 장기동",
      addressRegion: "경기도",
      addressCountry: "KR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 37.6319,
      longitude: 126.715,
    },
    openingHoursSpecification: HOURS.schedule
      .filter((h) => h.open)
      .map((h) => {
        const dayMap: Record<string, string> = {
          월요일: "Monday",
          화요일: "Tuesday",
          수요일: "Wednesday",
          목요일: "Thursday",
          금요일: "Friday",
          토요일: "Saturday",
          일요일: "Sunday",
        };
        const [open, close] = h.time.split(" - ");
        return {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: dayMap[h.day],
          opens: open,
          closes: close,
        };
      }),
    medicalSpecialty: [
      "Dentistry",
      "Implant Dentistry",
      "Orthodontics",
      "Prosthodontics",
      "Pediatric Dentistry",
    ],
    availableService: TREATMENTS.map((t) => ({
      "@type": "MedicalProcedure",
      name: t.name,
      description: t.shortDesc,
    })),
    employee: {
      "@type": "Dentist",
      name: doctor.name,
      jobTitle: doctor.position,
      description: `${doctor.education[0]}. ${doctor.credentials[0]}.`,
    },
    priceRange: "₩₩",
    image: `${BASE_URL}/images/og-image.jpg`,
  };
}

/**
 * 개별 진료과목 페이지용 JSON-LD (MedicalWebPage)
 */
export function getTreatmentJsonLd(treatmentId: string) {
  const treatment = TREATMENTS.find((t) => t.id === treatmentId);
  if (!treatment) return null;

  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${treatment.name} | ${CLINIC.name}`,
    description: treatment.shortDesc,
    url: `${BASE_URL}${treatment.href}`,
    mainEntity: {
      "@type": "MedicalProcedure",
      name: treatment.name,
      description: treatment.shortDesc,
    },
    provider: {
      "@type": "Dentist",
      name: CLINIC.name,
      telephone: CLINIC.phone,
    },
  };
}

/**
 * FAQ 페이지용 JSON-LD (FAQPage)
 */
export function getFaqJsonLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

/**
 * 빵부스러기(BreadcrumbList) JSON-LD
 */
export function getBreadcrumbJsonLd(
  items: { name: string; href: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.href}`,
    })),
  };
}
