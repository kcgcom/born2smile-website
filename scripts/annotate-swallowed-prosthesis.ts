/**
 * Additive, backwards-compatible annotation data; older renderers ignore citations.
 * Preview: node --env-file=.env.local --import tsx scripts/annotate-swallowed-prosthesis.ts
 * Save: append --apply. The existing related link stays usable until the UI is deployed.
 */
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { blogPostUpdateSchema } from "../lib/blog-validation";
import type { BlogBlock, BlogCitation } from "../lib/blog/types";
import citations from "./data/swallowed-prosthesis-citations.json";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수가 필요합니다");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const slug = "swallowed-dental-prosthesis-what-to-do";
  const before = await db.from("blog_posts").select("content,updated_at").eq("slug", slug).single();
  if (before.error) throw new Error(before.error.message);
  const blocks: BlogBlock[] = structuredClone(before.data.content);

  for (const citation of citations as BlogCitation[]) {
    const matches = blocks.filter((block) => (
      (block.type === "paragraph" && block.text.includes(citation.quote))
      || (block.type === "faq" && block.answer.includes(citation.quote))
    ));
    assert.equal(matches.length, 1, `본문 변경 확인 필요: ${citation.id}`);
    const block = matches[0];
    if (block.type !== "paragraph" && block.type !== "faq") throw new Error("주석 대상 오류");
    const existing = block.citations?.find((item) => item.id === citation.id);
    if (existing) assert.deepEqual(existing, citation, `기존 주석 변경 확인 필요: ${citation.id}`);
    else block.citations = [...(block.citations ?? []), citation];
  }
  blogPostUpdateSchema.parse({ blocks });
  if (isDeepStrictEqual(blocks, before.data.content)) {
    console.log("이미 적용되어 있습니다.");
    return;
  }
  if (!process.argv.includes("--apply")) {
    console.log("검증 완료: 주석 3개 추가 예정. 저장하려면 --apply를 사용하세요.");
    return;
  }
  const saved = await db.from("blog_posts")
    .update({ content: blocks, updated_at: new Date().toISOString(), updated_by: "codex" })
    .eq("slug", slug).eq("updated_at", before.data.updated_at).select("slug");
  if (saved.error) throw new Error(saved.error.message);
  assert.equal(saved.data.length, 1, "동시 수정이 감지되어 저장하지 않았습니다");
  const after = await db.from("blog_posts").select("content").eq("slug", slug).single();
  if (after.error) throw new Error(after.error.message);
  assert.deepEqual(after.data.content, blocks);
  console.log("주석 3개 저장 및 재조회 검증 완료. 본문·기존 링크는 보존했습니다.");
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
