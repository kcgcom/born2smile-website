import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CLINIC, BASE_URL } from "@/lib/constants";
import {
  ALL_CATEGORY_SLUGS,
  getCategoryFromSlug,
  getCategorySlug,
  getBlogPostUrl,
} from "@/lib/blog";
import { getAllPublishedPostMetas } from "@/lib/blog-firestore";
import { getBreadcrumbJsonLd } from "@/lib/jsonld";
import { FadeIn } from "@/components/ui/Motion";
import BlogContent from "@/components/blog/BlogContent";

export const revalidate = 3600;

export function generateStaticParams() {
  return ALL_CATEGORY_SLUGS.map((category) => ({ category }));
}

/** 카테고리별 SEO 메타데이터 */
const CATEGORY_META: Record<string, { title: string; description: string }> = {
  implant: {
    title: "임플란트 정보",
    description: "임플란트 수술 과정, 관리법, 비용, 주의사항 등 임플란트에 관한 전문 정보를 알려드립니다.",
  },
  orthodontics: {
    title: "치아교정 정보",
    description: "교정 종류, 기간, 관리법, 교정 전후 주의사항 등 치아교정에 관한 전문 정보를 알려드립니다.",
  },
  prosthetics: {
    title: "보철치료 정보",
    description: "크라운, 브릿지, 틀니 등 보철치료의 종류와 관리법에 관한 전문 정보를 알려드립니다.",
  },
  restorative: {
    title: "보존치료 정보",
    description: "충치 치료, 신경 치료, 레진 수복 등 보존치료에 관한 전문 정보를 알려드립니다.",
  },
  pediatric: {
    title: "소아치료 정보",
    description: "어린이 충치 예방, 불소 도포, 실란트, 소아 교정 등 소아치료에 관한 전문 정보를 알려드립니다.",
  },
  prevention: {
    title: "예방관리 정보",
    description: "스케일링, 양치법, 잇몸 관리, 구강 위생 등 예방관리에 관한 전문 정보를 알려드립니다.",
  },
  "health-tips": {
    title: "건강상식",
    description: "구강 건강과 전신 건강의 관계, 올바른 생활 습관 등 건강 상식을 알려드립니다.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const categoryValue = getCategoryFromSlug(category);
  if (!categoryValue) return {};

  const meta = CATEGORY_META[category] ?? { title: categoryValue, description: "" };
  const fullTitle = `${meta.title} | ${CLINIC.name} 건강칼럼`;
  const categoryUrl = `${BASE_URL}/blog/${category}`;

  return {
    title: meta.title,
    description: `${CLINIC.name} ${meta.description}`,
    alternates: { canonical: categoryUrl },
    openGraph: {
      title: fullTitle,
      description: meta.description,
      siteName: CLINIC.name,
      locale: "ko_KR",
      url: categoryUrl,
      images: [
        {
          url: "/images/og-image.jpg",
          width: 1200,
          height: 630,
          alt: CLINIC.name,
        },
      ],
    },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categoryValue = getCategoryFromSlug(category);
  if (!categoryValue) notFound();

  const allPosts = await getAllPublishedPostMetas();
  const categoryPosts = allPosts.filter((post) => post.category === categoryValue);

  const meta = CATEGORY_META[category];
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "건강칼럼", href: "/blog" },
    { name: categoryValue, href: `/blog/${category}` },
  ]);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${meta?.title ?? categoryValue} | ${CLINIC.name}`,
    description: meta?.description ?? "",
    url: `${BASE_URL}/blog/${category}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: Math.min(categoryPosts.length, 10),
      itemListElement: categoryPosts.slice(0, 10).map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}${getBlogPostUrl(post.slug, post.category)}`,
        name: post.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <FadeIn>
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Health Column
            </p>
            <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
              {categoryValue}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray-600">
              {meta?.description ?? `${categoryValue}에 관한 전문 정보를 알려드립니다.`}
            </p>
          </FadeIn>
        </div>
      </section>

      <BlogContent initialPosts={categoryPosts} activeDefaultCategory={categoryValue} />

      <div className="h-16 md:hidden" />
    </>
  );
}
