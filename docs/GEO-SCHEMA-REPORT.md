# GEO Schema & Structured Data Audit — 서울본치과

**Site:** https://www.born2smile.co.kr
**Audit Date:** 2026-03-30
**Auditor:** GEO Schema Agent (claude-sonnet-4-6)

---

## Schema & Structured Data

**Schema Score: 62/100** — Fair

### Score Breakdown

| Component | Max | Earned | Notes |
|---|---|---|---|
| Organization/LocalBusiness | 20 | 14 | Present with @id (10pts); sameAs has only 2 active platforms — Google Business + Naver Place (4pts partial) |
| Article/content schema | 15 | 12 | BlogPosting present with author as Person (12pts); dateModified conditionally present |
| Person schema for author | 15 | 8 | Physician schema on /about only (8pts); no sameAs on Person, no knowsAbout on Person |
| sameAs completeness | 15 | 3 | Only 2 platforms linked (Google Maps, Naver Place); no Wikipedia, Wikidata, LinkedIn, YouTube, Crunchbase (3pts) |
| speakable property | 10 | 10 | Present on BlogPosting with cssSelector targeting h1, .blog-post-excerpt, article p (10pts) |
| BreadcrumbList | 5 | 5 | Present and valid on all audited pages (5pts) |
| WebSite + SearchAction | 5 | 2 | WebSite present; potentialAction/SearchAction missing (2pts partial) |
| No deprecated schemas | 5 | 5 | HowTo function exists in code but is NOT rendered — correctly omitted (5pts) |
| JSON-LD format | 5 | 5 | All schemas use JSON-LD exclusively, server-rendered in initial HTML (5pts) |
| Validation (no errors) | 5 | 3 | Minor issues: Review dates as YYYY-MM (non-ISO 8601), empty sameAs values filtered but upstream LINKS empty, HowTo schema in jsonld.ts never called |

**Total: 67/100** — Good (revised after detailed validation)

---

### Detected Structured Data

#### Page 1: Homepage (https://www.born2smile.co.kr)

**Total Schema Blocks Found:** 4
**Format Used:** JSON-LD (all server-rendered in initial HTML)

| # | Type | Source | Valid | Rich Result Eligible |
|---|---|---|---|---|
| 1 | Dentist + MedicalBusiness | root layout.tsx (all pages) | Yes | N/A (LocalBusiness) |
| 2 | WebSite | app/page.tsx | Partial | No — missing SearchAction |
| 3 | BreadcrumbList | app/page.tsx | Yes | Yes |
| 4 | FAQPage | app/page.tsx | Yes | Restricted (non-authority site) |

#### Page 2: Treatment Page (https://www.born2smile.co.kr/treatments/implant)

**Total Schema Blocks Found:** 4
**Format Used:** JSON-LD (all server-rendered in initial HTML)

| # | Type | Source | Valid | Rich Result Eligible |
|---|---|---|---|---|
| 1 | Dentist + MedicalBusiness | root layout.tsx | Yes | N/A |
| 2 | MedicalWebPage | treatments/[slug]/page.tsx | Yes | N/A |
| 3 | FAQPage | treatments/[slug]/page.tsx | Yes | Restricted |
| 4 | BreadcrumbList | treatments/[slug]/page.tsx | Yes | Yes |

#### Page 3: Blog Post (https://www.born2smile.co.kr/blog/implant/gimpo-implant-clinic-checklist)

**Total Schema Blocks Found:** 3–4 (FAQPage is conditional on 2+ FAQ blocks)
**Format Used:** JSON-LD (all server-rendered in initial HTML)

| # | Type | Source | Valid | Rich Result Eligible |
|---|---|---|---|---|
| 1 | Dentist + MedicalBusiness | root layout.tsx | Yes | N/A |
| 2 | BlogPosting | blog/[category]/[slug]/page.tsx | Yes | Yes (Article) |
| 3 | BreadcrumbList | blog/[category]/[slug]/page.tsx | Yes | Yes |
| 4 | FAQPage | blog/[category]/[slug]/page.tsx | Conditional | Restricted |

#### Page 4: About Page (https://www.born2smile.co.kr/about)

**Total Schema Blocks Found:** 3
**Format Used:** JSON-LD (all server-rendered in initial HTML)

| # | Type | Source | Valid | Rich Result Eligible |
|---|---|---|---|---|
| 1 | Dentist + MedicalBusiness | root layout.tsx | Yes | N/A |
| 2 | Physician | about/page.tsx | Yes | N/A |
| 3 | BreadcrumbList | about/page.tsx | Yes | Yes |

---

### Validation Results

#### Schema Block: Dentist + MedicalBusiness (root layout — all pages)

**Status:** Valid with gaps

| Property | Status | Value/Issue |
|---|---|---|
| @context | OK | "https://schema.org" |
| @type | OK | ["Dentist", "MedicalBusiness"] — dual type, valid |
| @id | OK | "https://www.born2smile.co.kr/#organization" |
| name | OK | "서울본치과" |
| alternateName | OK | Array with 3 variants |
| description | OK | Present, includes local SEO keywords |
| url | OK | "https://www.born2smile.co.kr" |
| telephone | OK | "+82-1833-7552" |
| address | OK | PostalAddress with all required fields |
| geo | OK | GeoCoordinates with lat/lng |
| areaServed | OK | Array of City + AdministrativeArea — good local SEO |
| openingHoursSpecification | OK | Full weekly schedule, open days only |
| medicalSpecialty | OK | Array of specialty strings |
| availableService | OK | 6 MedicalProcedure entries |
| employee | OK | Embedded Dentist+Person for the lead doctor |
| sameAs | CRITICAL GAP | Only 2 URLs active: Google Business Profile + Naver Place. kakaoChannel, instagram, naverBlog are empty strings (filtered out at runtime). No Wikipedia, Wikidata, LinkedIn, YouTube, Crunchbase. |
| priceRange | OK | "₩₩" |
| image | OK | Absolute URL to og-image.jpg |
| aggregateRating | OK | Computed from REVIEWS array (6 reviews, all 5-star) |
| review | MINOR ISSUE | datePublished values formatted as "YYYY-MM" (e.g., "2026-01"). ISO 8601 requires at minimum "YYYY-MM-DD". The code appends "-01" for 7-char dates — this IS handled in jsonld.ts (line 126: `r.date.length === 7 ? ${r.date}-01 : r.date`). Valid. |
| foundingDate | MISSING | Not present — AI models cannot determine clinic age |
| contactPoint | MISSING | No ContactPoint schema for phone/email inquiries |

#### Schema Block: WebSite (homepage only)

**Status:** Partial — missing critical SearchAction

| Property | Status | Value/Issue |
|---|---|---|
| @context | OK | "https://schema.org" |
| @type | OK | "WebSite" |
| @id | OK | "https://www.born2smile.co.kr/#website" |
| url | OK | BASE_URL |
| name | OK | CLINIC.name |
| description | OK | Present |
| inLanguage | OK | "ko-KR" |
| publisher | OK | References organization via @id |
| potentialAction | MISSING | No SearchAction defined — Sitelinks Search Box ineligible |

#### Schema Block: BreadcrumbList (all pages)

**Status:** Valid

| Property | Status | Value/Issue |
|---|---|---|
| @type | OK | "BreadcrumbList" |
| itemListElement | OK | ListItem array with position, name, item |
| item URLs | OK | Fully qualified absolute URLs |
| position | OK | 1-indexed integers |

#### Schema Block: FAQPage (homepage, treatment pages, conditionally blog posts)

**Status:** Valid — but restricted for rich results

| Property | Status | Value/Issue |
|---|---|---|
| @type | OK | "FAQPage" |
| mainEntity | OK | Array of Question objects |
| acceptedAnswer | OK | Answer with text property |
| Rich Result Eligibility | RESTRICTED | Since August 2023, Google only shows FAQPage rich results for government and recognized health authority sites. This clinic does not qualify. Schema is not harmful but will not generate rich results. May still help AI models parse Q&A structure. |

#### Schema Block: MedicalWebPage (treatment pages)

**Status:** Valid but thin

| Property | Status | Value/Issue |
|---|---|---|
| @context | OK | "https://schema.org" |
| @type | OK | "MedicalWebPage" |
| name | OK | Treatment name + clinic name |
| description | OK | Treatment shortDesc |
| url | OK | Fully qualified URL |
| medicalAudience | OK | Patient type |
| specialty | OK | "Dentistry" |
| mainEntity | OK | MedicalProcedure embedded |
| provider | OK | Dentist with name and telephone |
| datePublished | MISSING | No publication date — AI models cannot assess freshness |
| dateModified | MISSING | No modification date |
| author | MISSING | No author attribution on medical pages |
| image | MISSING | No image property |
| about | MISSING | No about property linking to broader topic |

#### Schema Block: BlogPosting (blog post pages)

**Status:** Good — most properties present

| Property | Status | Value/Issue |
|---|---|---|
| @context | OK | "https://schema.org" |
| @type | OK | "BlogPosting" |
| headline | OK | title + subtitle, sliced to 110 chars |
| description | OK | post.excerpt |
| datePublished | OK | post.date (ISO 8601 date string from Supabase) |
| dateModified | OK | post.dateModified ?? post.date — conditionally present |
| url | OK | Fully qualified URL via getBlogPostUrl() |
| author | OK | Person with @id, name, jobTitle, url — linked to /about page |
| author.sameAs | MISSING | The Person object in author has no sameAs array — AI cannot verify author identity on external platforms |
| publisher | OK | Organization with name, url, logo (ImageObject) |
| image | OK | ImageObject with url, width (1200), height (630) |
| mainEntityOfPage | OK | WebPage with @id |
| articleSection | OK | Korean category label |
| keywords | OK | post.tags array |
| inLanguage | OK | "ko-KR" |
| speakable | OK | SpeakableSpecification with cssSelector array |
| wordCount | MISSING | Not present — AI models use this to assess content depth |
| isPartOf | MISSING | No reference to parent blog collection |

#### Schema Block: Physician (about page only)

**Status:** Good — well-structured authority schema

| Property | Status | Value/Issue |
|---|---|---|
| @context | OK | "https://schema.org" |
| @type | OK | "Physician" |
| @id | OK | References same @id used in BlogPosting author |
| name | OK | Doctor's full name |
| jobTitle | OK | "치과의사, 통합치의학전문의" |
| url | OK | Links to /about page |
| worksFor | OK | References Dentist @id |
| alumniOf | OK | Array of CollegeOrUniversity — Seoul National University |
| hasCredential | OK | Array of EducationalOccupationalCredential |
| memberOf | OK | Array of professional organizations (6 memberships) |
| knowsAbout | OK | Array of dental specialties |
| image | OK | Absolute URL to doctor photo |
| sameAs | MISSING | No links to LinkedIn, ResearchGate, or professional profiles — AI cannot verify doctor identity cross-platform |
| description | MISSING | No brief biography text |

---

### GEO-Critical Schema Assessment

| Schema | Status | GEO Impact | Notes |
|---|---|---|---|
| Organization + sameAs | Partial | Critical | Dentist schema present and detailed. sameAs has only 2 active URLs (Google Business, Naver Place). kakaoChannel, instagram, naverBlog are configured as empty strings. No Wikipedia, Wikidata, LinkedIn, YouTube, or Crunchbase. Entity graph is thin. |
| Person (author) | Partial | High | Physician schema on /about only. BlogPosting embeds author as Person with @id cross-reference. No sameAs on the Person schema — AI cannot verify the doctor's identity cross-platform. |
| Article + dateModified | Good | High | BlogPosting has datePublished, dateModified (conditional), author as Person, publisher as Organization. Missing wordCount. |
| speakable | Present | Medium | SpeakableSpecification with cssSelector on BlogPosting. Targets h1, .blog-post-excerpt, article > p:first-of-type. Well-implemented. |
| BreadcrumbList | Present | Low | Valid on all audited pages. Properly uses absolute URLs and sequential positions. |
| WebSite + SearchAction | Partial | Low | WebSite present with @id and publisher cross-reference. potentialAction/SearchAction is absent — Sitelinks Search Box not possible. |
| HowTo | Correctly absent | N/A | getHowToJsonLd() function exists in lib/jsonld.ts but is never called in the treatment page renderer. This is correct — Google removed HowTo rich results in September 2023. The function should be deleted to prevent accidental future use. |
| foundingDate | Missing | Medium | AI models use founding date to assess organizational authority and longevity. |
| ContactPoint | Missing | Low | Useful for AI models routing contact queries. |

---

### sameAs Entity Linking

**Current sameAs links found:** 2 active (4 configured, 2 empty)

The `sameAs` array in the Dentist/MedicalBusiness schema is built from `Object.values(LINKS).filter((url) => url !== "")`. The LINKS constant currently has:

| Platform | Configured | Active in sameAs | URL |
|---|---|---|---|
| Kakao Channel | Yes — empty string | No | Not configured |
| Instagram | Yes — empty string | No | Not configured |
| Naver Blog | Yes — empty string | No | Not configured |
| Naver Map | Yes | Yes | https://naver.me/IMy2FmsZ |
| Kakao Map | Yes | Yes | https://kko.to/nVk0hY6cH8 |
| Google Business | Yes | Yes | https://www.google.com/maps/place/?q=place_id:... |
| Naver Place | Yes | Yes | https://m.place.naver.com/hospital/698879488 |

**Note:** The Naver Map and Kakao Map short URLs are navigation map links, not entity profile pages. They are less authoritative for AI entity linking than dedicated business profile pages. Only Google Business Profile and Naver Place qualify as genuine entity profile URLs.

**Critical missing platforms:**

| Platform | Linked | URL |
|---|---|---|
| Wikipedia | No | Not linked — strongest AI entity signal |
| Wikidata | No | Not linked |
| LinkedIn | No | Not configured |
| YouTube | No | Not configured |
| Crunchbase | No | N/A for local dental clinic |
| Instagram | No | Configured but empty |
| Naver Blog | No | Configured but empty |
| Google Business Profile | Yes | https://www.google.com/maps/place/?q=place_id:ChIJv6ztq7eGfDURXB0HJQ3ZpQg |
| Naver Place | Yes | https://m.place.naver.com/hospital/698879488 |

**Assessment:** The sameAs implementation is partially built — the infrastructure (LINKS constant, filter logic, schema injection) is correct and production-ready. The gap is entirely in the LINKS constant having empty values for social media. Filling in Instagram, Naver Blog, and any other platforms the clinic operates on would immediately improve AI entity resolution. Wikipedia and Wikidata are long-term goals; for a local dental clinic they require notable external coverage.

---

### Deprecated/Restricted Schemas

| Schema | Status | Found On | Recommendation |
|---|---|---|---|
| HowTo | Removed (Sep 2023) | NOT rendered (function in codebase unused) | Delete getHowToJsonLd() from lib/jsonld.ts to prevent accidental future use |
| FAQPage | Restricted (Aug 2023) | Homepage, treatment pages, conditionally blog posts | Keep — provides semantic Q&A structure for AI crawlers even without rich results. Do not prioritize adding more FAQPage instances. |

No deprecated schemas are actively rendered on the site. This is a positive signal.

---

### JavaScript Rendering Risk

**Schema Delivery Method:** Server-rendered in initial HTML — all schemas are safe for AI crawlers.

All JSON-LD blocks are injected via React Server Components using `dangerouslySetInnerHTML` on `<script type="application/ld+json">` tags. The root layout renders the primary Dentist schema on every page at the server level. Page-level schemas (WebSite, BreadcrumbList, BlogPosting, MedicalWebPage) are also rendered server-side.

The site uses Next.js 16 App Router with SSG + ISR. JSON-LD is in the static HTML output — it is not injected by client-side JavaScript.

**AI Crawler Compatibility:** All schemas (GPTBot, ClaudeBot, PerplexityBot, Googlebot) will see every JSON-LD block in the raw HTML response. No JavaScript execution is required.

**One caveat:** `AdminDraftBar` and `AdminFloatingButton` use dynamic client-side imports, but these contain no structured data. Risk: none.

---

### Recommended JSON-LD Templates

#### 1. Organization — Enhanced sameAs Entity Linking

The current Dentist/MedicalBusiness schema is well-structured. The only required change is populating the `sameAs` array with all active platform profiles. Update `lib/constants.ts` LINKS values, and the schema will update automatically. Additionally add `foundingDate` and `contactPoint` directly to `getClinicJsonLd()` in `lib/jsonld.ts`.

**Additions to make in `getClinicJsonLd()` in `lib/jsonld.ts`:**

```json
{
  "@context": "https://schema.org",
  "@type": ["Dentist", "MedicalBusiness"],
  "@id": "https://www.born2smile.co.kr/#organization",
  "name": "서울본치과",
  "foundingDate": "[REPLACE: YYYY — year the clinic opened, e.g. 2018]",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+82-1833-7552",
    "contactType": "customer service",
    "areaServed": "KR",
    "availableLanguage": "Korean",
    "hoursAvailable": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Thursday", "Friday", "Saturday"],
      "opens": "09:30",
      "closes": "18:30"
    }
  },
  "sameAs": [
    "https://www.google.com/maps/place/?q=place_id:ChIJv6ztq7eGfDURXB0HJQ3ZpQg",
    "https://m.place.naver.com/hospital/698879488",
    "[REPLACE: Instagram URL — e.g. https://www.instagram.com/born2smile_dental]",
    "[REPLACE: Naver Blog URL — e.g. https://blog.naver.com/born2smile]",
    "[REPLACE: YouTube channel URL if the clinic has one]",
    "[REPLACE: KakaoTalk Channel URL if configured]"
  ]
}
```

**Implementation:** Add `foundingDate` and `contactPoint` to the return object of `getClinicJsonLd()` in `/home/dev/projects/born2smile-website/lib/jsonld.ts`. Populate LINKS values in `/home/dev/projects/born2smile-website/lib/constants.ts`.

---

#### 2. WebSite — Add SearchAction for Sitelinks Search Box

Replace the current `getWebSiteJsonLd()` return value in `lib/jsonld.ts`. This enables Google's Sitelinks Search Box and signals to AI assistants that the site has searchable content.

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.born2smile.co.kr/#website",
  "url": "https://www.born2smile.co.kr",
  "name": "서울본치과",
  "description": "김포 한강신도시 장기동 치과 — 서울대 출신 통합치의학전문의 운영",
  "inLanguage": "ko-KR",
  "publisher": {
    "@id": "https://www.born2smile.co.kr/#organization"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.born2smile.co.kr/blog?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

**Implementation:** Update `getWebSiteJsonLd()` in `/home/dev/projects/born2smile-website/lib/jsonld.ts` to include the `potentialAction` block. Note: the blog search URL template should point to whatever search endpoint the site supports. If no site search exists, omit this until one is implemented — a non-functional SearchAction is worse than none.

---

#### 3. Physician — Add sameAs and description

Update `getDoctorJsonLd()` in `lib/jsonld.ts` to add the missing properties. These are important for AI models verifying the doctor's E-E-A-T credentials.

```json
{
  "@context": "https://schema.org",
  "@type": "Physician",
  "@id": "https://www.born2smile.co.kr/about#doctor-kim-changgyun",
  "name": "김창균",
  "jobTitle": "치과의사, 통합치의학전문의",
  "description": "서울대학교 치의학대학원 석사, 통합치의학전문의. 미국 AAID 인정의. 임플란트·심미보철·치아교정 전문. 서울본치과 대표원장.",
  "url": "https://www.born2smile.co.kr/about",
  "image": "https://www.born2smile.co.kr/images/doctors/kim-changgyun.jpg",
  "worksFor": {
    "@type": "Dentist",
    "@id": "https://www.born2smile.co.kr/#organization",
    "name": "서울본치과"
  },
  "knowsAbout": ["임플란트", "치아교정", "심미보철", "통합치의학", "소아치과", "보존치료"],
  "sameAs": [
    "[REPLACE: Doctor's LinkedIn profile URL if available]",
    "[REPLACE: Doctor's ResearchGate or academic profile URL if available]",
    "[REPLACE: Doctor's Naver blog author URL if available]"
  ],
  "alumniOf": [
    {
      "@type": "CollegeOrUniversity",
      "name": "서울대학교 치의학대학원"
    },
    {
      "@type": "CollegeOrUniversity",
      "name": "서울대학교 공과대학"
    }
  ],
  "hasCredential": [
    {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "professional",
      "name": "미국 치과의사 자격시험(National Board of Dental Examination) 통과"
    },
    {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "certification",
      "name": "미국치과임플란트학회(AAID) 인정의(Affiliate Associate Fellow)"
    }
  ],
  "memberOf": [
    { "@type": "Organization", "name": "국제교정협회(IAO)" },
    { "@type": "Organization", "name": "국제구강임플란트학회(ICOI)" },
    { "@type": "Organization", "name": "대한치과이식임플란트학회(KAID)" },
    { "@type": "Organization", "name": "미국심미치과학회(AACD)" },
    { "@type": "Organization", "name": "대한심미치과학회(KAED)" }
  ]
}
```

**Implementation:** Update `getDoctorJsonLd()` in `/home/dev/projects/born2smile-website/lib/jsonld.ts` to add `description` and `sameAs`. Populate `sameAs` with any available external profile URLs for the doctor.

---

#### 4. BlogPosting — Add wordCount and isPartOf

The current `getBlogPostJsonLd()` in `lib/jsonld.ts` is strong. Two additions would complete it.

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "[post.title — post.subtitle, max 110 chars]",
  "description": "[post.excerpt]",
  "datePublished": "[post.date — ISO 8601]",
  "dateModified": "[post.dateModified ?? post.date]",
  "wordCount": "[REPLACE: computed word count of post body — estimate from content blocks]",
  "isPartOf": {
    "@type": "Blog",
    "@id": "https://www.born2smile.co.kr/blog#blog",
    "name": "서울본치과 건강칼럼",
    "url": "https://www.born2smile.co.kr/blog"
  },
  "author": {
    "@type": "Person",
    "@id": "https://www.born2smile.co.kr/about#doctor-kim-changgyun",
    "name": "김창균",
    "jobTitle": "치과의사, 통합치의학전문의",
    "url": "https://www.born2smile.co.kr/about",
    "sameAs": [
      "[REPLACE: Doctor's LinkedIn URL]",
      "[REPLACE: Doctor's other professional profile URL]"
    ]
  },
  "publisher": {
    "@type": "Organization",
    "name": "서울본치과",
    "url": "https://www.born2smile.co.kr",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.born2smile.co.kr/images/og-image.jpg"
    }
  },
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", ".blog-post-excerpt", "article > p:first-of-type"]
  }
}
```

**Implementation:** In `getBlogPostJsonLd()` in `/home/dev/projects/born2smile-website/lib/jsonld.ts`, add `wordCount` (computed from `post.blocks` or `post.content` character count approximation) and `isPartOf`. Also add `sameAs` to the nested `author` Person object.

---

#### 5. MedicalWebPage — Add datePublished and author

The current treatment page schema (`getTreatmentJsonLd()`) is thin on metadata. AI models need freshness signals on medical content.

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "name": "[treatment.name] | 서울본치과",
  "description": "[treatment.shortDesc]",
  "url": "https://www.born2smile.co.kr/treatments/[slug]",
  "datePublished": "[REPLACE: ISO 8601 date when the treatment page was first published]",
  "dateModified": "[REPLACE: ISO 8601 date of last content update]",
  "author": {
    "@type": "Physician",
    "@id": "https://www.born2smile.co.kr/about#doctor-kim-changgyun",
    "name": "김창균"
  },
  "reviewedBy": {
    "@type": "Physician",
    "@id": "https://www.born2smile.co.kr/about#doctor-kim-changgyun",
    "name": "김창균"
  },
  "medicalAudience": {
    "@type": "Patient"
  },
  "specialty": "Dentistry",
  "inLanguage": "ko-KR",
  "isPartOf": {
    "@type": "WebSite",
    "@id": "https://www.born2smile.co.kr/#website"
  },
  "mainEntity": {
    "@type": "MedicalProcedure",
    "name": "[treatment.name]",
    "description": "[treatment.shortDesc]",
    "availableAt": {
      "@type": "Dentist",
      "@id": "https://www.born2smile.co.kr/#organization",
      "name": "서울본치과"
    }
  },
  "provider": {
    "@type": "Dentist",
    "@id": "https://www.born2smile.co.kr/#organization",
    "name": "서울본치과",
    "telephone": "+82-1833-7552"
  }
}
```

**Implementation:** Update `getTreatmentJsonLd()` in `/home/dev/projects/born2smile-website/lib/jsonld.ts`. Add static `datePublished` and `dateModified` constants (perhaps stored in `lib/treatments.ts` per treatment), and add the `author`, `reviewedBy`, `inLanguage`, and `isPartOf` properties.

---

#### 6. Blog CollectionPage — Add Blog @id (homepage blog section)

A `Blog` entity schema should be added to `/blog` page to create a named entity that `isPartOf` links back to from individual posts.

```json
{
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": "https://www.born2smile.co.kr/blog#blog",
  "name": "서울본치과 건강칼럼",
  "description": "서울본치과 건강칼럼 - 임플란트·교정·보존치료·예방관리에 관한 올바른 구강건강 정보",
  "url": "https://www.born2smile.co.kr/blog",
  "inLanguage": "ko-KR",
  "publisher": {
    "@id": "https://www.born2smile.co.kr/#organization"
  },
  "author": {
    "@id": "https://www.born2smile.co.kr/about#doctor-kim-changgyun"
  }
}
```

**Implementation:** Add this to the blog hub page (`app/blog/page.tsx`) or create a new `getBlogEntityJsonLd()` function in `lib/jsonld.ts`. This provides the target for `isPartOf` references in individual BlogPosting schemas.

---

### Priority Actions

1. **[CRITICAL]** Populate `LINKS` constant with all active social and platform profiles — Instagram, Naver Blog, KakaoTalk Channel, and any YouTube channel. The sameAs infrastructure in `getClinicJsonLd()` is already built correctly; only the data values in `lib/constants.ts` are missing. Each platform URL added immediately improves AI entity resolution.

2. **[HIGH]** Add `sameAs` to the `Physician` schema in `getDoctorJsonLd()` (`lib/jsonld.ts`). Include the doctor's LinkedIn profile, ResearchGate, or any other verifiable external profile. Author identity verification is the single most actionable E-E-A-T improvement for blog content.

3. **[HIGH]** Add `sameAs` to the `author` Person object inside `getBlogPostJsonLd()` (`lib/jsonld.ts`). This mirrors the Physician schema change for all blog posts — AI models reading blog content can then verify the author identity cross-platform without visiting the /about page.

4. **[HIGH]** Add `foundingDate` to `getClinicJsonLd()` in `lib/jsonld.ts`. This is a single constant addition. AI models use organizational founding date as a trust signal for medical entities.

5. **[MEDIUM]** Add `potentialAction` (SearchAction) to `getWebSiteJsonLd()` in `lib/jsonld.ts` — but only once a site-wide search feature is implemented. If the blog has query parameter filtering (`/blog?q=`), that URL template qualifies immediately.

6. **[MEDIUM]** Add `datePublished`, `dateModified`, `author`, and `reviewedBy` to `getTreatmentJsonLd()` in `lib/jsonld.ts`. Treatment pages are the highest-value medical content on the site — freshness and authorship signals directly affect AI citability for dental queries.

7. **[MEDIUM]** Add `description` to `getDoctorJsonLd()` in `lib/jsonld.ts`. A one-sentence biography in structured data helps AI models describe the doctor accurately when the site is cited.

8. **[MEDIUM]** Add `wordCount` and `isPartOf` to `getBlogPostJsonLd()` in `lib/jsonld.ts`. `wordCount` helps AI models assess content depth. `isPartOf` links individual posts back to the blog entity for graph coherence.

9. **[LOW]** Add a `Blog` entity schema to `app/blog/page.tsx` (or via a new `getBlogEntityJsonLd()` function) with an `@id` that individual BlogPosting `isPartOf` references can resolve to.

10. **[LOW]** Delete or mark `getHowToJsonLd()` in `lib/jsonld.ts` as deprecated with a code comment. The function is never called (correctly) but its presence creates risk of accidental future use. Adding a JSDoc `@deprecated` comment and noting Google's September 2023 removal would prevent this.

11. **[LOW]** Add `contactPoint` to `getClinicJsonLd()` in `lib/jsonld.ts` with the clinic phone number, contact type, and available hours. This helps AI assistants route contact queries correctly.

---

### Implementation Summary

All recommended changes target two files:

**`/home/dev/projects/born2smile-website/lib/jsonld.ts`** — Schema generation functions
- `getClinicJsonLd()`: add `foundingDate`, `contactPoint`
- `getWebSiteJsonLd()`: add `potentialAction` with SearchAction
- `getDoctorJsonLd()`: add `description`, `sameAs`
- `getBlogPostJsonLd()`: add `wordCount`, `isPartOf`, `sameAs` on author
- `getTreatmentJsonLd()`: add `datePublished`, `dateModified`, `author`, `reviewedBy`, `inLanguage`, `isPartOf`
- New: `getBlogEntityJsonLd()` for the blog hub page
- `getHowToJsonLd()`: add `@deprecated` JSDoc comment

**`/home/dev/projects/born2smile-website/lib/constants.ts`** — Data values only
- `LINKS.instagram`: populate with clinic Instagram URL
- `LINKS.naverBlog`: populate with clinic Naver Blog URL
- `LINKS.kakaoChannel`: populate with KakaoTalk Channel URL
- Add `CLINIC.foundingYear` or similar constant

No changes to page files are required for the high-priority items — the schema generation functions feed all pages automatically.
