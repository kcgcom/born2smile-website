// =============================================================
// Supabase snapshot에서 블로그 메타데이터를 자동 추출하여 생성 파일 작성
// 실행: pnpm generate-blog-meta
// =============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(__dirname, "../lib/blog/generated/posts-meta.ts");

async function main() {
  const metas = BLOG_POSTS_SNAPSHOT
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle,
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags,
      date: post.date,
      dateModified: post.dateModified,
      readTime: post.readTime ?? "1분",
    }));

  if (BLOG_POSTS_SNAPSHOT.length === 0) {
    console.warn("⚠ No snapshot blog posts found in lib/blog/generated/posts-snapshot.ts");
  }
  const sortedMetas = metas.sort((a, b) => b.date.localeCompare(a.date));

  const json = JSON.stringify(sortedMetas, null, 2);

  const output = `// =============================================================
// 이 파일은 자동 생성됩니다. 직접 수정하지 마세요.
// 실행: pnpm generate-blog-meta
// =============================================================

import type { BlogPostMeta } from "../types";

export const BLOG_POSTS_META: BlogPostMeta[] = ${json};
`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, output, "utf-8");

  console.log(
    `Generated metadata for ${sortedMetas.length} blog posts from snapshot → lib/blog/generated/posts-meta.ts`,
  );
}

main().catch((err) => {
  console.error("Failed to generate blog metadata:", err);
  process.exit(1);
});
