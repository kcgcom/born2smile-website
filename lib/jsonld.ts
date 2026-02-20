import { BASE_URL, CLINIC, DOCTORS, HOURS, MAP, TREATMENTS, LINKS, REVIEWS } from "./constants";
import type { BlogPost } from "./blog/types";

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
    telephone: CLINIC.phoneIntl,
    address: {
      "@type": "PostalAddress",
      streetAddress: CLINIC.addressShort,
      addressLocality: "김포시 장기동",
      addressRegion: "경기도",
      postalCode: "10089",
      addressCountry: "KR",
    },
    areaServed: [
      { "@type": "City", name: "김포시" },
      { "@type": "AdministrativeArea", name: "한강신도시" },
      { "@type": "AdministrativeArea", name: "장기동" },
    ],
    geo: {
      "@type": "GeoCoordinates",
      latitude: MAP.lat,
      longitude: MAP.lng,
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
      qualifications: doctor.credentials.map((c) => c),
      memberOf: doctor.memberships.map((m) => ({
        "@type": "Organization",
        name: m,
      })),
    },
    sameAs: Object.values(LINKS).filter((url) => url !== ""),
    priceRange: "₩₩",
    image: `${BASE_URL}/images/og-image.jpg`,
    ...(REVIEWS.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: String(
          (REVIEWS.reduce((sum, r) => sum + r.rating, 0) / REVIEWS.length).toFixed(1)
        ),
        reviewCount: String(REVIEWS.length),
        bestRating: "5",
        worstRating: "1",
      },
      review: REVIEWS.map((r) => ({
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: String(r.rating),
        },
        author: { "@type": "Person", name: r.name },
        datePublished: r.date.length === 7 ? `${r.date}-01` : r.date,
        reviewBody: r.text,
      })),
    }),
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
    medicalAudience: {
      "@type": "Patient",
    },
    specialty: "Dentistry",
    mainEntity: {
      "@type": "MedicalProcedure",
      name: treatment.name,
      description: treatment.shortDesc,
    },
    provider: {
      "@type": "Dentist",
      name: CLINIC.name,
      telephone: CLINIC.phoneIntl,
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
 * 블로그 포스트용 JSON-LD (BlogPosting)
 * Google 검색 결과에 블로그 글 정보가 표시됩니다.
 */
export function getBlogPostJsonLd(post: BlogPost) {
  const doctor = DOCTORS[0];

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: `${post.title} — ${post.subtitle}`.slice(0, 110),
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.dateModified ?? post.date,
    url: `${BASE_URL}/blog/${post.slug}`,
    author: {
      "@type": "Person",
      name: doctor.name,
      jobTitle: doctor.position,
    },
    publisher: {
      "@type": "Organization",
      name: CLINIC.name,
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/images/og-image.jpg`,
      },
    },
    image: {
      "@type": "ImageObject",
      url: `${BASE_URL}/images/og-image.jpg`,
      width: 1200,
      height: 630,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${post.slug}`,
    },
    articleSection: post.category,
    keywords: post.tags,
    inLanguage: "ko-KR",
  };
}

/**
 * 블로그 목록 페이지용 JSON-LD (CollectionPage + ItemList)
 * 최신 10개 포스트를 구조화 데이터로 표시
 */
export function getBlogCollectionJsonLd(
  posts: { slug: string; title: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `건강칼럼 | ${CLINIC.name}`,
    description: `${CLINIC.name} 건강칼럼 - 올바른 구강관리법과 치과 상식`,
    url: `${BASE_URL}/blog`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: Math.min(posts.length, 10),
      itemListElement: posts.slice(0, 10).map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/blog/${post.slug}`,
        name: post.title,
      })),
    },
  };
}

/**
 * 빵 부스러기(BreadcrumbList) JSON-LD
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
