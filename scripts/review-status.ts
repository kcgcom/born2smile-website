// =============================================================
// 블로그 포스트 검수 현황 출력
// 실행: pnpm review-status
// =============================================================

import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { getCategoryLabel } from "../lib/blog/category-slugs";
import type { BlogCategorySlug } from "../lib/blog/types";

interface PostReviewInfo {
  slug: string;
  category: BlogCategorySlug;
  date: string;
  title: string;
  reviewedDate?: string;
}

async function main() {
  const posts: PostReviewInfo[] = BLOG_POSTS_SNAPSHOT.map((post) => ({
    slug: post.slug,
    category: post.category as BlogCategorySlug,
    date: post.date,
    title: post.title,
    reviewedDate: post.reviewedDate,
  }));

  const reviewed = posts.filter((p) => p.reviewedDate);
  const unreviewed = posts.filter((p) => !p.reviewedDate);

  const total = posts.length;
  const doneCount = reviewed.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  console.log(`\n블로그 검수 현황: ${doneCount}/${total} 완료 (${pct}%)\n`);

  // 카테고리별 그룹핑
  const categories: BlogCategorySlug[] = [
    "prevention",
    "restorative",
    "prosthetics",
    "implant",
    "orthodontics",
    "pediatric",
    "health-tips",
  ];

  if (unreviewed.length > 0) {
    console.log(`── 미검수 (${unreviewed.length}건) ──`);
    for (const cat of categories) {
      const catPosts = unreviewed
        .filter((p) => p.category === cat)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (catPosts.length === 0) continue;
      console.log(`\n  [${getCategoryLabel(cat)}] ${catPosts.length}건`);
      for (const p of catPosts) {
        console.log(`    ${p.slug}  (${p.date})  ${p.title}`);
      }
    }
  }

  if (reviewed.length > 0) {
    console.log(`\n── 검수 완료 (${reviewed.length}건) ──`);
    for (const cat of categories) {
      const catPosts = reviewed
        .filter((p) => p.category === cat)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (catPosts.length === 0) continue;
      console.log(`\n  [${getCategoryLabel(cat)}] ${catPosts.length}건`);
      for (const p of catPosts) {
        console.log(`    ${p.slug}  (검수: ${p.reviewedDate})  ${p.title}`);
      }
    }
  }

  console.log("");
}

main().catch((err) => {
  console.error("Failed to check review status:", err);
  process.exit(1);
});
