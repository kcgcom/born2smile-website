/**
 * 억지스러운 FAQ 블록 제거 스크립트
 * 실행: npx tsx scripts/remove-forced-faq.ts
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Block { type: string; question?: string; [key: string]: unknown }

// 삭제할 FAQ 질문 정의 (slug → 삭제할 question 목록)
const REMOVE_MAP: Record<string, string[]> = {
  // Type A: 제목과 동일한 질문
  "children-oral-habits":   ["손가락 빨기는 언제까지 지켜봐도 될까요?"],
  "mouth-ulcer-care":       ["구내염, 왜 생기는 걸까?"],
  "wisdom-teeth-extraction": ["사랑니, 꼭 빼야 하나요?"],
  "teeth-sensitivity-causes": ["찌릿한 그 느낌, 왜 생길까요?"],
  // Type B: 본문 내용 중복 + 공포 어조
  "gum-recession-causes":       ["잇몸 퇴축이란?", "잇몸 퇴축, 방치하면 어떻게 될까?"],
  "baby-teeth-cavity-treatment": ["유치 충치, 방치하면 어떤 일이 생길까?", "유치 충치 치료, 어떻게 하나요?"],
  // Type C: 질문이 아닌 문장
  "gum-disease-prevention": ["이런 증상이 있다면 치과에 가 보세요"],
  // Type D: 추상적 요약형
  "gimpo-implant-clinic-checklist": ["결론적으로 무엇을 먼저 확인하면 좋을까요?"],
};

async function run() {
  const slugs = Object.keys(REMOVE_MAP);
  console.log(`\n🗑️  총 ${slugs.length}개 포스트 FAQ 정리 시작\n`);

  let success = 0;
  let failed = 0;

  for (const slug of slugs) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, content")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      console.log(`❌ ${slug}: 조회 실패 — ${error?.message}`);
      failed++;
      continue;
    }

    const content: Block[] = Array.isArray(data.content) ? data.content : [];
    const toRemove = REMOVE_MAP[slug];

    const before = content.filter(b => b.type === "faq").length;
    const newContent = content.filter(b => {
      if (b.type !== "faq") return true;
      return !toRemove.some(q => b.question?.includes(q.slice(0, 10)));
    });
    const after = newContent.filter(b => b.type === "faq").length;
    const removed = before - after;

    if (removed === 0) {
      console.log(`⚠️  ${slug}: 해당 FAQ를 찾지 못함 (이미 삭제됐거나 텍스트 불일치)`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ content: newContent })
      .eq("slug", slug);

    if (updateError) {
      console.log(`❌ ${slug}: 업데이트 실패 — ${updateError.message}`);
      failed++;
    } else {
      console.log(`✅ ${slug}: FAQ ${removed}개 삭제 (${before}개 → ${after}개)`);
      success++;
    }
  }

  console.log(`\n완료: ✅ ${success}개 성공, ❌ ${failed}개 실패`);
}

run().catch((e) => { console.error(e); process.exit(1); });
