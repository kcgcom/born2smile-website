import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CLINIC, BASE_URL } from "@/lib/constants";
import {
  ALL_CATEGORY_SLUGS,
  getCategoryLabel,
  getCategoryFromSlug,
} from "@/lib/blog";
import { getAllPublishedPostMetas } from "@/lib/blog-supabase";
import { getBreadcrumbJsonLd, getCategoryCollectionJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { FadeIn } from "@/components/ui/Motion";
import BlogContent from "@/components/blog/BlogContent";

export const revalidate = 3600;

export function generateStaticParams() {
  return ALL_CATEGORY_SLUGS.map((category) => ({ category }));
}

const META_DESCRIPTION_MIN = 150;
const META_DESCRIPTION_MAX = 160;

function fitMetaDescription(base: string): string {
  const normalized = base.replace(/\s+/g, " ").trim();

  if (normalized.length > META_DESCRIPTION_MAX) {
    return `${normalized.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`;
  }

  if (normalized.length >= META_DESCRIPTION_MIN) {
    return normalized;
  }

  const expanded = `${normalized} 핵심 내용과 실천 팁을 함께 확인해 보세요.`;

  if (expanded.length > META_DESCRIPTION_MAX) {
    return `${expanded.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`;
  }

  return expanded;
}

/** 카테고리별 SEO 메타데이터 */
const CATEGORY_META: Record<string, { title: string; description: string; keywords: string[] }> = {
  implant: {
    title: "임플란트 정보",
    description: "임플란트 수술을 앞두고 궁금한 검사 과정, 뼈이식이 필요한 경우, 마취와 통증 관리, 회복 기간별 주의사항, 오래 쓰기 위한 사후관리와 정기검진 포인트까지 실제 진료 흐름에 맞춰 자세히 설명합니다. 치아 상실 원인별 치료 선택 기준과 상담 준비 팁도 확인할 수 있습니다.",
    keywords: ["김포 임플란트", "장기동 임플란트", "한강신도시 임플란트", "임플란트 정보", "김포 임플란트 치과"],
  },
  orthodontics: {
    title: "치아교정 정보",
    description: "치아교정 장치별 특징과 선택 기준, 발치 여부 판단, 연령대별 교정 계획, 치료 기간과 내원 주기, 교정 중 통증·위생관리, 유지장치 착용 기간까지 교정 전후에 꼭 알아야 할 정보를 체계적으로 안내합니다. 성인·청소년 교정 상담 전 준비사항까지 한 번에 확인할 수 있습니다.",
    keywords: ["김포 치아교정", "장기동 치아교정", "한강신도시 치아교정", "치아교정 정보", "김포 교정 치과"],
  },
  prosthetics: {
    title: "보철치료 정보",
    description: "크라운·브릿지·틀니·심미보철의 차이와 적응증, 재료 선택 기준, 치료 단계와 예상 기간, 파절·탈락을 줄이는 관리법, 식사·세척 요령, 재치료가 필요한 신호까지 보철치료 핵심을 알기 쉽게 정리했습니다. 노년기 기능 회복과 심미 개선을 함께 고려한 선택 가이드도 제공합니다.",
    keywords: ["김포 보철치료", "장기동 보철치료", "한강신도시 보철치료", "보철치료 정보", "김포 보철 치과"],
  },
  restorative: {
    title: "보존치료 정보",
    description: "충치치료, 레진수복, 인레이, 신경치료가 필요한 시점과 진단 기준, 통증·마취 관리, 치료 횟수와 예후, 재감염을 줄이는 생활습관, 자연치아를 오래 보존하기 위한 사후관리 방법까지 자세히 알려드립니다. 치료 후 시림·통증이 지속될 때 점검할 체크리스트도 함께 제공합니다.",
    keywords: ["김포 보존치료", "장기동 보존치료", "한강신도시 보존치료", "보존치료 정보", "김포 충치 치료"],
  },
  pediatric: {
    title: "소아치료 정보",
    description: "어린이 충치 예방을 위한 불소도포·실란트 적정 시기, 유치·영구치 관리 차이, 첫 내원 준비와 치과 공포 줄이는 방법, 성장기 교정 체크포인트, 보호자 칫솔질 지도 팁까지 소아치과 핵심 정보를 꼼꼼히 안내합니다. 가정에서 실천할 식습관·구강위생 교육 팁도 함께 제공합니다.",
    keywords: ["김포 소아치과", "장기동 소아치과", "한강신도시 소아치과", "소아치료 정보", "김포 어린이 치과"],
  },
  prevention: {
    title: "예방관리 정보",
    description: "스케일링 주기와 잇몸 상태별 관리법, 올바른 칫솔질·치실·치간칫솔 사용 순서, 구취·치석·잇몸출혈을 줄이는 생활습관, 정기검진에서 확인하는 항목과 예방치료의 필요성까지 일상 실천 중심으로 설명합니다. 치주질환을 예방하는 맞춤 홈케어 루틴과 내원 주기도 함께 제안합니다.",
    keywords: ["김포 스케일링", "장기동 스케일링", "한강신도시 스케일링", "예방관리 정보", "김포 치과 검진"],
  },
  "health-tips": {
    title: "건강상식",
    description: "구강 건강과 전신 건강의 연관성, 음식·수면·스트레스가 치아와 잇몸에 미치는 영향, 연령별 관리 습관, 자주 묻는 치과 상식 팩트체크, 집에서 실천 가능한 예방법까지 가족 모두를 위한 건강 정보를 제공합니다. 증상별로 언제 치과에 내원해야 하는지도 쉽고 명확히 안내합니다.",
    keywords: ["구강 건강", "치아 건강 상식", "치과 건강 정보"],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const categorySlug = getCategoryFromSlug(category);
  if (!categorySlug) return {};
  const categoryLabel = getCategoryLabel(categorySlug);

  const meta = CATEGORY_META[category] ?? { title: categoryLabel, description: "", keywords: [] };
  const isLocal = category !== "health-tips";
  const localTitle = isLocal ? `김포 ${meta.title}` : meta.title;
  const localDesc = fitMetaDescription(
    isLocal
      ? `김포 ${meta.title}, ${CLINIC.name}. ${meta.description}`
      : `${CLINIC.name} ${meta.description}`,
  );
  const fullTitle = `${localTitle} | ${CLINIC.name} 건강칼럼`;
  const categoryUrl = `${BASE_URL}/blog/${category}`;

  return {
    title: localTitle,
    description: localDesc,
    keywords: meta.keywords,
    alternates: { canonical: categoryUrl },
    openGraph: {
      title: fullTitle,
      description: localDesc,
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
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: localDesc,
      images: ["/images/og-image.jpg"],
    },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categorySlug = getCategoryFromSlug(category);
  if (!categorySlug) notFound();
  const categoryLabel = getCategoryLabel(categorySlug);

  const allPosts = await getAllPublishedPostMetas();
  const categoryPosts = allPosts.filter((post) => post.category === categorySlug);

  const meta = CATEGORY_META[category];
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "건강칼럼", href: "/blog" },
    { name: categoryLabel, href: `/blog/${category}` },
  ]);

  const collectionJsonLd = getCategoryCollectionJsonLd({
    title: meta?.title ?? categoryLabel,
    description: meta?.description ?? "",
    categorySlug: category,
    posts: categoryPosts,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <FadeIn>
            <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
              Health Column
            </p>
            <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
              {categoryLabel}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray-600">
              {meta?.description ?? `${categoryLabel}에 관한 전문 정보를 알려드립니다.`}
            </p>
          </FadeIn>
        </div>
      </section>

      <BlogContent initialPosts={categoryPosts} activeDefaultCategory={categorySlug} />

      <div className="h-16 md:hidden" />
    </>
  );
}
