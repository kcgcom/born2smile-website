import assert from "node:assert/strict";
import {
  CATEGORY_KEYWORDS,
  KEYWORD_CATEGORY_SLUGS,
  getBlogCategoryForKeywordTopic,
} from "../lib/admin-naver-datalab-keywords";
import { isBlogCategorySlug } from "../lib/blog";
import { validateKeywordTaxonomy } from "../lib/admin-keyword-taxonomy";

const taxonomy = validateKeywordTaxonomy(CATEGORY_KEYWORDS);
const categorySlugs = taxonomy.map((category) => category.slug);
assert.deepEqual(
  [...categorySlugs].sort(),
  [...KEYWORD_CATEGORY_SLUGS].sort(),
  "카테고리 상수와 코드 택소노미가 일치해야 합니다.",
);

const normalizedKeywords = new Map<string, string>();
for (const category of taxonomy) {
  for (const subgroup of category.subGroups) {
    const contentCategory = getBlogCategoryForKeywordTopic(category.slug, subgroup.name);
    assert.equal(isBlogCategorySlug(contentCategory), true, `${category.slug}/${subgroup.name}의 공개 발행 카테고리가 유효하지 않습니다.`);
    assert.equal(
      category.topicAngles.some((angle) => angle.subGroup === subgroup.name),
      true,
      `${category.slug}/${subgroup.name}의 주제 템플릿이 없습니다.`,
    );
    for (const keyword of subgroup.keywords) {
      const normalized = keyword.replace(/\s+/g, "").toLowerCase();
      const previous = normalizedKeywords.get(normalized);
      assert.equal(previous, undefined, `${keyword}가 ${previous}와 중복됩니다.`);
      normalizedKeywords.set(normalized, `${category.slug}/${subgroup.name}`);
    }
  }
}

assert.equal(getBlogCategoryForKeywordTopic("general-care", "발치/사랑니"), "health-tips");
assert.equal(getBlogCategoryForKeywordTopic("general-care", "잇몸재생"), "prevention");
assert.equal(categorySlugs.includes("general-care"), true);
assert.equal(categorySlugs.includes("health-tips"), true);
assert.equal(taxonomy.find((category) => category.slug === "general-care")?.subGroups.some((group) => group.name === "잇몸재생"), true);
assert.equal(taxonomy.find((category) => category.slug === "prevention")?.subGroups.some((group) => group.name.includes("잇몸재생")), false);

console.log(JSON.stringify({
  ok: true,
  categories: taxonomy.length,
  subgroups: taxonomy.reduce((sum, category) => sum + category.subGroups.length, 0),
  keywords: normalizedKeywords.size,
  analysisOnlyMappings: taxonomy.flatMap((category) => category.subGroups
    .map((subgroup) => ({ slug: category.slug, subGroup: subgroup.name, contentCategory: getBlogCategoryForKeywordTopic(category.slug, subgroup.name) }))
    .filter((item) => item.slug !== item.contentCategory)),
}, null, 2));
