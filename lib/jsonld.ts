import { getOpeningHoursJsonLd } from "./opening-hours-jsonld";
import { BASE_URL, CLINIC, DOCTORS, MAP, TREATMENTS } from "./constants";
import type { BlogPost } from "./blog/types";
import type { BlogCategoryValue } from "./blog/types";
import { getBlogPostUrl, getCategoryLabel } from "./blog/category-slugs";
import { getMeaningfulDateModified } from "./blog/dates";
import { getBlogArticleImage } from "./blog/seo-image";
import type { ResolvedSiteClinic, SiteHours, SiteLinks } from "./site-config-supabase";

/**
 * JSON-LD 문자열 직렬화 시 </script> 브레이크아웃을 막기 위한 이스케이프.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * 치과의원 메인 JSON-LD (Dentist + LocalBusiness)
 * Google/네이버 검색 결과에 병원 정보, 진료시간, 연락처 등이 표시됩니다.
 */
export function getClinicJsonLd({ clinic, hours, links }: {
  clinic: ResolvedSiteClinic;
  hours: SiteHours;
  links: SiteLinks;
}) {
  const doctor = DOCTORS[0];

  return {
    "@context": "https://schema.org",
    "@type": ["Dentist", "MedicalBusiness"],
    "@id": `${BASE_URL}/#organization`,
    name: clinic.name,
    alternateName: ["서울 본치과", "본치과", clinic.nameEn],
    description: `김포 ${clinic.neighborhood} ${clinic.name}. ${doctor.position}. 임플란트, 치아교정, 심미보철, 소아치료, 보존치료, 스케일링.`,
    url: BASE_URL,
    telephone: clinic.phoneIntl,
    address: {
      "@type": "PostalAddress",
      streetAddress: clinic.addressShort,
      addressLocality: "김포시 장기동",
      addressRegion: "경기도",
      postalCode: "10089",
      addressCountry: "KR",
    },
    areaServed: [
      { "@type": "City", name: "김포시" },
      { "@type": "AdministrativeArea", name: "한강신도시" },
      { "@type": "AdministrativeArea", name: "장기동" },
      { "@type": "PostalAddress", postalCode: "10089", addressCountry: "KR" },
    ],
    geo: {
      "@type": "GeoCoordinates",
      latitude: MAP.lat,
      longitude: MAP.lng,
    },
    ...getOpeningHoursJsonLd(hours),
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
      "@type": ["Dentist", "Person"],
      name: doctor.name,
      jobTitle: doctor.position,
      description: `${doctor.education[0]}. ${doctor.credentials[0]}.`,
      alumniOf: doctor.education.map((edu) => ({
        "@type": edu.includes("고등학교") ? "HighSchool" : "CollegeOrUniversity",
        name: edu.replace(/ (졸업|수료|박사 수료)$/, ""),
      })),
      hasCredential: doctor.credentials.map((c) => ({
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "professional",
        name: c,
      })),
      qualifications: doctor.credentials.map((c) => c),
      memberOf: doctor.memberships.map((m) => ({
        "@type": "Organization",
        name: m,
      })),
    },
    sameAs: Object.values(links).filter((url) => url !== ""),
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
    medicalAudience: {
      "@type": "Patient",
    },
    specialty: "Dentistry",
    mainEntity: {
      "@type": "MedicalProcedure",
      name: treatment.name,
      description: treatment.shortDesc,
      availableAt: {
        "@type": "Dentist",
        name: CLINIC.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: "김포시 장기동",
          addressRegion: "경기도",
        },
      },
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
export function getFaqJsonLd(faq: { q: string; a: string; link?: unknown }[]) {
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
  const dateModified = getMeaningfulDateModified(post) ?? post.date;
  const image = getBlogArticleImage(post);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: `${post.title} — ${post.subtitle}`.slice(0, 110),
    description: post.excerpt,
    datePublished: post.date,
    dateModified,
    url: `${BASE_URL}${getBlogPostUrl(post.slug, post.category)}`,
    author: {
      "@type": "Person",
      "@id": `${BASE_URL}/about#doctor-kim-changgyun`,
      name: doctor.name,
      jobTitle: doctor.position,
      url: `${BASE_URL}/about`,
      sameAs: [`${BASE_URL}/about`],
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
    ...(image && { image: {
      "@type": "ImageObject",
      url: image.url,
      ...(image.width && { width: image.width }),
      ...(image.height && { height: image.height }),
    } }),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}${getBlogPostUrl(post.slug, post.category)}`,
    },
    articleSection: getCategoryLabel(post.category),
    keywords: post.tags,
    inLanguage: "ko-KR",
  };
}

/**
 * 블로그 목록 페이지용 JSON-LD (CollectionPage + ItemList)
 * 최신 10개 포스트를 구조화 데이터로 표시
 */
export function getBlogCollectionJsonLd(
  posts: { slug: string; title: string; category: BlogCategoryValue }[]
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
        url: `${BASE_URL}${getBlogPostUrl(post.slug, post.category)}`,
        name: post.title,
      })),
    },
  };
}

/**
 * 블로그 카테고리 허브 페이지용 JSON-LD (CollectionPage + ItemList)
 * 지역 SEO 강화: isPartOf(clinic), provider, about 포함
 */
export function getCategoryCollectionJsonLd(opts: {
  title: string;
  description: string;
  categorySlug: string;
  posts: { slug: string; title: string; category: BlogCategoryValue }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${opts.title} | ${CLINIC.name}`,
    description: opts.description,
    url: `${BASE_URL}/blog/${opts.categorySlug}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: Math.min(opts.posts.length, 10),
      itemListElement: opts.posts.slice(0, 10).map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}${getBlogPostUrl(post.slug, post.category)}`,
        name: post.title,
      })),
    },
    isPartOf: {
      "@type": "Dentist",
      name: CLINIC.name,
      url: BASE_URL,
    },
    provider: {
      "@type": "Dentist",
      name: CLINIC.name,
      telephone: CLINIC.phoneIntl,
    },
    about: {
      "@type": "Thing",
      name: opts.title,
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

/**
 * 의사 개인 JSON-LD (Physician)
 * /about 페이지에 삽입하여 의사를 독립 엔티티로 인식시킵니다.
 */
export function getDoctorJsonLd() {
  const doctor = DOCTORS[0];
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    "@id": `${BASE_URL}/about#doctor-kim-changgyun`,
    name: doctor.name,
    jobTitle: doctor.position,
    url: `${BASE_URL}/about`,
    worksFor: {
      "@type": "Dentist",
      "@id": `${BASE_URL}/#organization`,
      name: CLINIC.name,
    },
    alumniOf: doctor.education
      .filter((e) => !e.includes("고등학교"))
      .map((e) => ({
        "@type": "CollegeOrUniversity",
        name: e.replace(/ (졸업|수료|박사 수료|석사 졸업)$/, ""),
      })),
    hasCredential: doctor.credentials.map((c) => ({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "professional",
      name: c,
    })),
    memberOf: doctor.memberships.map((m) => ({
      "@type": "Organization",
      name: m,
    })),
    knowsAbout: ["임플란트", "치아교정", "심미보철", "통합치의학", "소아치과", "보존치료"],
  };
}

/**
 * WebSite JSON-LD
 * 홈페이지에 삽입하여 사이트를 named entity로 등록합니다.
 */
export function getWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    url: BASE_URL,
    name: CLINIC.name,
    description: `김포 한강신도시 장기동 치과 — 서울대 출신 치과전문의 운영`,
    inLanguage: "ko-KR",
    publisher: {
      "@id": `${BASE_URL}/#organization`,
    },
  };
}
