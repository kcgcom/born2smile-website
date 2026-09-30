/** Preview by default; append --apply to save. Run with node --env-file=.env.local --import tsx. */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { blogPostUpdateSchema } from "../lib/blog-validation";
import { restoreResearchCalloutLabels } from "../lib/blog/research-callout-notices";
import type { BlogBlock } from "../lib/blog/types";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수가 필요합니다.");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, count, error } = await db.from("blog_posts").select("slug, content, updated_at", { count: "exact" })
    .contains("content", JSON.stringify([{ type: "researchCallout" }]));
  if (error) throw new Error(error.message);
  assert.equal(data.length, count, "조회 한도를 초과했습니다. 전체 조회 후 다시 실행해야 합니다.");
  const repairs = data.flatMap((row) => {
    const blocks = restoreResearchCalloutLabels(row.content as BlogBlock[]);
    if (isDeepStrictEqual(blocks, row.content)) return [];
    blogPostUpdateSchema.parse({ blocks });
    return [{ before: row, blocks }];
  });
  console.log(JSON.stringify({ posts: repairs.map((repair) => repair.before.slug), count: repairs.length }));
  if (!process.argv.includes("--apply") || !repairs.length) return;
  const backup = join(mkdtempSync(join(tmpdir(), "born2smile-callout-backup-")), "before.json");
  writeFileSync(backup, JSON.stringify(repairs.map((repair) => repair.before), null, 2), { mode: 0o600 });
  console.log(`복구 전 백업: ${backup}`);
  for (const { before, blocks } of repairs) {
    const saved = await db.from("blog_posts")
      .update({ content: blocks, updated_at: new Date().toISOString(), updated_by: "codex" })
      .eq("slug", before.slug).eq("updated_at", before.updated_at).select("slug");
    if (saved.error) throw new Error(saved.error.message);
    assert.equal(saved.data.length, 1, `${before.slug}: 동시 수정 감지, 저장 중단`);
    const after = await db.from("blog_posts").select("content").eq("slug", before.slug).single();
    if (after.error) throw new Error(after.error.message);
    assert.deepEqual(after.data.content, blocks);
    console.log(`${before.slug}: 복구 및 재조회 확인 완료`);
  }
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
