/**
 * implant-vs-bridge-comparison 포스트에 비교표 블록 추가
 * 실행: npx tsx scripts/add-comparison-table.ts
 */
import { createClient } from "@supabase/supabase-js";
import type { BlogBlock } from "../lib/blog/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SLUG = "implant-vs-bridge-comparison";

const TABLE_BLOCK: Extract<BlogBlock, { type: "table" }> = {
  type: "table",
  headers: ["항목", "임플란트", "브릿지"],
  rows: [
    ["치료 기간", "3~6개월", "2~3주"],
    ["초기 비용", "높음 (비급여)", "상대적으로 낮음"],
    ["수명", "10~20년 이상", "10~15년"],
    ["뼈 보존", "가능 (골흡수 억제)", "불가 (골흡수 진행)"],
    ["인접 치아 영향", "없음", "양옆 치아 삭제 필요"],
  ],
};

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 현재 포스트 조회
  const { data: post, error: fetchError } = await supabase
    .from("blog_posts")
    .select("slug, content")
    .eq("slug", SLUG)
    .single();

  if (fetchError || !post) {
    console.error("포스트 조회 실패:", fetchError);
    process.exit(1);
  }

  const blocks: BlogBlock[] = (post.content as BlogBlock[]) ?? [];
  console.log(`현재 블록 수: ${blocks.length}`);

  // 이미 table 블록이 있으면 중단
  if (blocks.some((b) => b.type === "table")) {
    console.log("이미 table 블록이 존재합니다. 종료합니다.");
    process.exit(0);
  }

  // "핵심 비교" heading 블록 위치 찾기
  const targetIndex = blocks.findIndex(
    (b) => b.type === "heading" && b.text.includes("핵심 비교")
  );

  if (targetIndex === -1) {
    console.error('"핵심 비교" 헤딩을 찾을 수 없습니다.');
    console.log("헤딩 목록:", blocks.filter((b) => b.type === "heading").map((b) => (b as { text: string }).text));
    process.exit(1);
  }

  console.log(`"핵심 비교" 헤딩 위치: ${targetIndex}번`);

  // 헤딩 바로 다음에 table 블록 삽입
  const updatedBlocks = [
    ...blocks.slice(0, targetIndex + 1),
    TABLE_BLOCK,
    ...blocks.slice(targetIndex + 1),
  ];

  const { error: updateError } = await supabase
    .from("blog_posts")
    .update({ content: updatedBlocks })
    .eq("slug", SLUG);

  if (updateError) {
    console.error("업데이트 실패:", updateError);
    process.exit(1);
  }

  console.log(`✓ 비교표 블록 삽입 완료 (총 ${updatedBlocks.length}개 블록)`);
}

main();
