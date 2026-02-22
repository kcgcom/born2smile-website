// =============================================================
// 블로그 포스트 검수 현황 출력
// 실행: pnpm review-status
// =============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.resolve(__dirname, "../lib/blog/posts");

interface PostReviewInfo {
  slug: string;
  category: string;
  date: string;
  title: string;
  reviewedDate?: string;
}

async function main() {
  const files = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts");

  const posts: PostReviewInfo[] = [];

  for (const file of files) {
    const mod = await import(path.join(postsDir, file));
    if (!mod.post) continue;
    const { slug, category, date, title, reviewedDate } = mod.post;
    posts.push({ slug, category, date, title, reviewedDate });
  }

  const reviewed = posts.filter((p) => p.reviewedDate);
  const unreviewed = posts.filter((p) => !p.reviewedDate);

  const total = posts.length;
  const doneCount = reviewed.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  console.log(`\n블로그 검수 현황: ${doneCount}/${total} 완료 (${pct}%)\n`);

  // 카테고리별 그룹핑
  const categories = [
    "예방관리",
    "보존치료",
    "보철치료",
    "임플란트",
    "치아교정",
    "소아치료",
    "건강상식",
  ];

  if (unreviewed.length > 0) {
    console.log(`── 미검수 (${unreviewed.length}건) ──`);
    for (const cat of categories) {
      const catPosts = unreviewed
        .filter((p) => p.category === cat)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (catPosts.length === 0) continue;
      console.log(`\n  [${cat}] ${catPosts.length}건`);
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
      console.log(`\n  [${cat}] ${catPosts.length}건`);
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
