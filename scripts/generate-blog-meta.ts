// =============================================================
// 블로그 포스트 파일에서 메타데이터를 자동 추출하여 생성 파일 작성
// 실행: pnpm generate-blog-meta
// =============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.resolve(__dirname, "../lib/blog/posts");
const outFile = path.resolve(__dirname, "../lib/blog/generated/posts-meta.ts");

async function main() {
  const files = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts");

  if (files.length === 0) {
    console.warn("⚠ No blog post files found in lib/blog/posts/");
  }

  const metas: Record<string, unknown>[] = [];

  for (const file of files) {
    const mod = await import(path.join(postsDir, file));
    if (!mod.post) {
      console.warn(`⚠ ${file}: export const post not found, skipping`);
      continue;
    }
    const { content, ...meta } = mod.post;

    // readTime 자동 계산: content 전체 글자 수 기반 (한국어 분당 ~500자)
    const CHARS_PER_MINUTE = 500;
    const totalChars = Array.isArray(content)
      ? content.reduce(
          (sum: number, section: { heading?: string; content?: string }) =>
            sum + (section.heading?.length ?? 0) + (section.content?.length ?? 0),
          0,
        )
      : 0;
    const calculatedMinutes = Math.max(1, Math.ceil(totalChars / CHARS_PER_MINUTE));
    meta.readTime = `${calculatedMinutes}분`;

    metas.push(meta);
  }

  // id 기준 정렬
  metas.sort((a, b) => (a.id as number) - (b.id as number));

  const json = JSON.stringify(metas, null, 2);

  const output = `// =============================================================
// 이 파일은 자동 생성됩니다. 직접 수정하지 마세요.
// 실행: pnpm generate-blog-meta
// =============================================================

import type { BlogPostMeta } from "../types";

export const BLOG_POSTS_META: BlogPostMeta[] = ${json};
`;

  const outDir = path.dirname(outFile);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, output, "utf-8");

  console.log(
    `Generated metadata for ${metas.length} blog posts → lib/blog/generated/posts-meta.ts`
  );
}

main().catch((err) => {
  console.error("Failed to generate blog metadata:", err);
  process.exit(1);
});
