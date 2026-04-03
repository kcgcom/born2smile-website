/**
 * relatedLinks 블록의 잘못된 'links' 필드를 'items'로 수정
 * 실행: npx tsx scripts/fix-related-links-field.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(p: string) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RelatedLinksBlock {
  type?: string;
  links?: unknown;
  items?: unknown;
  [key: string]: unknown;
}

async function run() {
  // relatedLinks 블록 있는 모든 발행 포스트 조회
  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("slug, content")
    .eq("published", true);

  if (error || !posts) { console.error("조회 실패:", error?.message); process.exit(1); }

  let fixed = 0;
  let skipped = 0;

  for (const post of posts) {
    const content: RelatedLinksBlock[] = Array.isArray(post.content) ? post.content : [];
    const needsFix = content.some(
      (block) => block.type === "relatedLinks" && block.links && !block.items,
    );
    if (!needsFix) { skipped++; continue; }

    const newContent = content.map((block) => {
      if (block.type === "relatedLinks" && block.links && !block.items) {
        const { links, ...rest } = block;
        return { ...rest, items: links };
      }
      return block;
    });

    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ content: newContent })
      .eq("slug", post.slug);

    if (updateError) {
      console.log(`❌ ${post.slug}: ${updateError.message}`);
    } else {
      console.log(`✅ ${post.slug}: links → items 수정`);
      fixed++;
    }
  }

  console.log(`\n완료: ✅ ${fixed}개 수정, ⏭️ ${skipped}개 이미 정상`);
}

run().catch((error) => { console.error(error); process.exit(1); });
