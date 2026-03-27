import { BLOG_POSTS_META } from "../generated/posts-meta";
import type { BlogCategorySlug, BlogPostMeta } from "../types";
import { healthTipsHub } from "./health-tips";
import { implantHub } from "./implant";
import { orthodonticsHub } from "./orthodontics";
import { pediatricHub } from "./pediatric";
import { preventionHub } from "./prevention";
import { prostheticsHub } from "./prosthetics";
import { restorativeHub } from "./restorative";
import type { CategoryHubConfig } from "./shared";

export type {
  CategoryHubConfig,
  CategoryHubQuestion,
  CategoryHubSection,
} from "./shared";

export const CATEGORY_HUBS = {
  implant: implantHub,
  orthodontics: orthodonticsHub,
  prosthetics: prostheticsHub,
  restorative: restorativeHub,
  pediatric: pediatricHub,
  prevention: preventionHub,
  "health-tips": healthTipsHub,
} satisfies Record<BlogCategorySlug, CategoryHubConfig>;

function flattenHubSlugs(config: CategoryHubConfig): string[] {
  return [
    ...config.questions.map((item) => item.slug),
    ...config.sections.flatMap((item) => item.slugs),
  ];
}

function buildPostLookup(): Map<string, BlogPostMeta> {
  return new Map(BLOG_POSTS_META.map((post) => [post.slug, post]));
}

function validateCategoryHubs() {
  const postLookup = buildPostLookup();

  for (const [category, config] of Object.entries(CATEGORY_HUBS) as [BlogCategorySlug, CategoryHubConfig][]) {
    for (const slug of flattenHubSlugs(config)) {
      const post = postLookup.get(slug);
      if (!post) {
        throw new Error(`[category-hubs] ${category} 허브에서 slug "${slug}"를 찾을 수 없습니다.`);
      }
      if (post.category !== category) {
        throw new Error(
          `[category-hubs] ${category} 허브의 slug "${slug}"가 다른 카테고리(${post.category})에 속해 있습니다.`,
        );
      }
    }
  }
}

validateCategoryHubs();

export function getCategoryHub(category: BlogCategorySlug): CategoryHubConfig {
  return CATEGORY_HUBS[category];
}
