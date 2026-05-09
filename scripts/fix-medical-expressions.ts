/**
 * 의학적 과장 표현 수정
 *
 * 1. tongue-health-signs: "성공률을 크게 높이므로, 서울본치과에서 확인받으세요" → 완화
 * 2. smoking-oral-health: 출처 없는 배수 통계 → 정성적 표현으로 완화
 *
 * 실행: npx dotenv-cli -e .env.local -- npx tsx scripts/fix-medical-expressions.ts
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

type Block = { type: string; text?: string; [key: string]: unknown };

/** 블록 배열 내 특정 텍스트를 찾아 교체 */
function replaceInBlocks(blocks: Block[], from: string, to: string): { blocks: Block[]; changed: boolean } {
  let changed = false;
  const newBlocks = blocks.map((block) => {
    if (typeof block.text === "string" && block.text.includes(from)) {
      changed = true;
      return { ...block, text: block.text.replace(from, to) };
    }
    return block;
  });
  return { blocks: newBlocks, changed };
}

async function fixPost(slug: string, fixes: Array<{ from: string; to: string; label: string }>) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, content")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.error(`❌ ${slug} 조회 실패:`, error?.message);
    return;
  }

  let blocks: Block[] = Array.isArray(data.content) ? data.content : [];
  let totalChanged = false;

  for (const fix of fixes) {
    const { blocks: newBlocks, changed } = replaceInBlocks(blocks, fix.from, fix.to);
    blocks = newBlocks;
    if (changed) {
      console.log(`  ✅ [${fix.label}] 수정됨`);
      totalChanged = true;
    } else {
      console.log(`  ⚠️  [${fix.label}] 대상 텍스트 미발견 (이미 수정됐거나 내용 변경)`);
    }
  }

  if (!totalChanged) {
    console.log(`  ⏭️  ${slug}: 수정 사항 없음`);
    return;
  }

  const { error: updateError } = await supabase
    .from("blog_posts")
    .update({ content: blocks })
    .eq("slug", slug);

  if (updateError) {
    console.error(`  ❌ ${slug} 저장 실패:`, updateError.message);
  } else {
    console.log(`  💾 ${slug}: Supabase 저장 완료`);
  }
}

async function run() {
  console.log("=== 의학적 과장 표현 수정 시작 ===\n");

  // 1. tongue-health-signs: 구강암 성공률 + 병원명 단정 표현
  console.log("[1/2] tongue-health-signs");
  await fixPost("tongue-health-signs", [
    {
      label: "구강암 성공률 과장 + 병원명",
      from: "조기 발견이 치료 성공률을 크게 높이므로, 혀의 이상이 2주 이상 지속된다면 서울본치과에서 정확한 원인을 확인받으세요.",
      to: "혀의 이상이 2주 이상 지속된다면 조기에 정확한 원인을 확인받는 것이 중요합니다.",
    },
  ]);

  // 2. smoking-oral-health: 출처 없는 배수 통계 표현
  console.log("\n[2/2] smoking-oral-health");
  await fixPost("smoking-oral-health", [
    {
      label: "임플란트 실패율 2~3배 통계",
      from: "흡연자의 임플란트 실패율은 비흡연자의 2~3배에 달합니다.",
      to: "흡연자는 비흡연자에 비해 임플란트 실패 위험이 높아질 수 있습니다.",
    },
    {
      label: "임플란트 주위염 4~5배 통계",
      from: "임플란트 주위염 발생 위험이 4~5배 높아져,",
      to: "임플란트 주위염 발생 위험도 높아져,",
    },
  ]);

  console.log("\n=== 완료 ===");
  console.log("스냅샷 재생성: pnpm generate-blog-snapshot");
}

run().catch((error) => { console.error(error); process.exit(1); });
