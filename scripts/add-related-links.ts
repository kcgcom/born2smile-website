/**
 * 관련글 블록 추가 스크립트 (49개 포스트)
 * 실행: npx tsx scripts/add-related-links.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// 포스트별 연관 슬러그 매핑 (slug → [related_slug × 3])
const RELATED_MAP: Record<string, string[]> = {
  // ── 교정 클러스터 ──────────────────────────────
  "retainer-after-orthodontics":    ["clear-aligner-care-guide", "orthodontic-diet-guide", "after-orthodontic-device-care"],
  "clear-vs-bracket-orthodontics":  ["orthodontic-treatment-duration", "orthodontic-diet-guide", "retainer-after-orthodontics"],
  "clear-aligner-care-guide":       ["orthodontic-diet-guide", "retainer-after-orthodontics", "after-orthodontic-device-care"],
  "after-orthodontic-device-care":  ["orthodontic-diet-guide", "retainer-after-orthodontics", "clear-aligner-care-guide"],
  "orthodontics-for-adults":        ["senior-orthodontics", "retainer-after-orthodontics", "clear-vs-bracket-orthodontics"],
  "senior-orthodontics":            ["orthodontics-for-adults", "retainer-after-orthodontics", "orthodontic-treatment-duration"],
  "orthodontic-treatment-duration": ["clear-vs-bracket-orthodontics", "retainer-after-orthodontics", "orthodontic-diet-guide"],

  // ── 보존치료 클러스터 ──────────────────────────
  "cavity-stages-and-treatment":    ["root-canal-pain-truth", "cracked-tooth-syndrome", "root-canal-and-crown"],
  "cracked-tooth-syndrome":         ["cavity-stages-and-treatment", "root-canal-pain-truth", "old-amalgam-replacement"],
  "root-canal-and-crown":           ["root-canal-pain-truth", "after-root-canal-care", "cavity-stages-and-treatment"],
  "root-canal-pain-truth":          ["root-canal-and-crown", "after-root-canal-care", "cavity-stages-and-treatment"],
  "old-amalgam-replacement":        ["cavity-stages-and-treatment", "cracked-tooth-syndrome", "root-canal-pain-truth"],
  "after-root-canal-care":          ["root-canal-and-crown", "root-canal-pain-truth", "after-tooth-extraction-care"],
  "after-tooth-extraction-care":    ["after-root-canal-care", "root-canal-pain-truth", "cavity-stages-and-treatment"],

  // ── 보철 클러스터 ──────────────────────────────
  "laminate-veneer-guide":          ["crown-material-comparison", "after-crown-prosthetic-care", "prosthetic-adjustment-period-guide"],
  "crown-material-comparison":      ["laminate-veneer-guide", "after-crown-prosthetic-care", "prosthetic-adjustment-period-guide"],
  "denture-care-tips":              ["denture-adjustment-guide", "denture-vs-implant", "prosthetic-adjustment-period-guide"],
  "denture-adjustment-guide":       ["denture-care-tips", "denture-vs-implant", "prosthetic-adjustment-period-guide"],
  "after-crown-prosthetic-care":    ["crown-material-comparison", "prosthetic-adjustment-period-guide", "laminate-veneer-guide"],

  // ── 예방/구강위생 클러스터 ──────────────────────
  "electric-vs-manual-toothbrush":  ["correct-brushing-method", "dental-floss-guide", "airflow-scaling-benefits"],
  "fluoride-treatment-adults":      ["brushing-timing-myths", "mouthwash-effectiveness", "gum-disease-prevention"],
  "brushing-timing-myths":          ["correct-brushing-method", "fluoride-treatment-adults", "scaling-frequency-guide"],
  "correct-brushing-method":        ["brushing-timing-myths", "dental-floss-guide", "scaling-frequency-guide"],
  "food-for-dental-health":         ["correct-brushing-method", "scaling-frequency-guide", "toothbrush-hygiene-tips"],
  "dental-floss-guide":             ["correct-brushing-method", "toothbrush-hygiene-tips", "electric-vs-manual-toothbrush"],
  "scaling-frequency-guide":        ["after-scaling-care", "correct-brushing-method", "dental-floss-guide"],
  "toothbrush-hygiene-tips":        ["correct-brushing-method", "dental-floss-guide", "electric-vs-manual-toothbrush"],
  "airflow-scaling-benefits":       ["electric-vs-manual-toothbrush", "scaling-frequency-guide", "after-scaling-care"],
  "after-scaling-care":             ["airflow-scaling-benefits", "scaling-frequency-guide", "after-gum-surgery-care"],
  "after-gum-surgery-care":         ["after-scaling-care", "gum-disease-prevention", "mouthwash-effectiveness"],

  // ── 소아 클러스터 ──────────────────────────────
  "sealant-for-children":           ["fluoride-vs-sealant-children", "fluoride-treatment-children", "children-dental-care"],
  "children-dental-trauma":         ["children-dental-care", "children-malocclusion-guide", "children-oral-habits"],
  "after-child-dental-treatment-care": ["fluoride-treatment-children", "sealant-for-children", "children-dental-care"],

  // ── 임산부 클러스터 ──────────────────────────────
  "prepregnancy-dental-checkup":    ["pregnancy-dental-care", "gum-disease-prevention", "mouthwash-effectiveness"],
  "pregnancy-dental-care":          ["prepregnancy-dental-checkup", "gum-disease-prevention", "after-gum-surgery-care"],

  // ── health-tips 수동 매핑 ──────────────────────
  "stress-and-teeth-grinding":      ["tmj-disorder-guide", "mouth-breathing-dental-effects", "bad-breath-causes-and-solutions"],
  "tmj-disorder-guide":             ["stress-and-teeth-grinding", "mouth-breathing-dental-effects", "broken-tooth-emergency"],
  "dry-mouth-syndrome":             ["medication-oral-side-effects", "diabetes-and-dental-health", "bad-breath-causes-and-solutions"],
  "medication-oral-side-effects":   ["dry-mouth-syndrome", "diabetes-and-dental-health", "smoking-oral-health"],
  "diabetes-and-dental-health":     ["medication-oral-side-effects", "dry-mouth-syndrome", "smoking-oral-health"],
  "smoking-oral-health":            ["bad-breath-causes-and-solutions", "dry-mouth-syndrome", "medication-oral-side-effects"],
  "bad-breath-causes-and-solutions":["smoking-oral-health", "dry-mouth-syndrome", "stress-and-teeth-grinding"],
  "teeth-whitening-safety":         ["after-whitening-care", "how-to-choose-a-trustworthy-dentist", "implant-brand-comparison"],
  "after-whitening-care":           ["teeth-whitening-safety", "how-to-choose-a-trustworthy-dentist", "broken-tooth-emergency"],
  "mouth-breathing-dental-effects": ["stress-and-teeth-grinding", "tmj-disorder-guide", "bad-breath-causes-and-solutions"],
  "dental-anesthesia-guide":        ["how-to-choose-a-trustworthy-dentist", "broken-tooth-emergency", "implant-brand-comparison"],
  "postpartum-dental-health":       ["pregnancy-dental-treatment-safety", "prepregnancy-dental-checkup", "gum-disease-prevention"],
  "pregnancy-dental-treatment-safety": ["postpartum-dental-health", "prepregnancy-dental-checkup", "dental-xray-radiation-safety"],
  "dental-xray-radiation-safety":   ["pregnancy-dental-treatment-safety", "how-to-choose-a-trustworthy-dentist", "dental-anesthesia-guide"],
};

interface PostMeta {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
}

async function run() {
  // 전체 발행 포스트 메타 조회
  const { data: allPosts, error: fetchError } = await supabase
    .from("blog_posts")
    .select("slug, title, category, excerpt")
    .eq("published", true);

  if (fetchError || !allPosts) {
    console.error("포스트 목록 조회 실패:", fetchError?.message);
    process.exit(1);
  }

  const metaMap = new Map<string, PostMeta>(
    allPosts.map((p: PostMeta) => [p.slug, p])
  );

  const slugs = Object.keys(RELATED_MAP);
  console.log(`\n🔗 총 ${slugs.length}개 포스트에 관련글 블록 추가 시작\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const slug of slugs) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, content")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (error || !data) {
      console.log(`❌ ${slug}: 조회 실패 — ${error?.message}`);
      failed++;
      continue;
    }

    const content: unknown[] = Array.isArray(data.content) ? data.content : [];

    // 이미 relatedLinks 있으면 스킵
    if (content.some((b: unknown) => (b as { type: string }).type === "relatedLinks")) {
      console.log(`⏭️  ${slug}: 이미 관련글 있음, 스킵`);
      skipped++;
      continue;
    }

    // 관련 포스트 메타 조합
    const relatedSlugs = RELATED_MAP[slug];
    const links = relatedSlugs
      .map((rSlug) => {
        const meta = metaMap.get(rSlug);
        if (!meta) return null;
        return {
          title: meta.title,
          href: `/blog/${meta.category}/${meta.slug}`,
          description: meta.excerpt?.slice(0, 60) || meta.title,
        };
      })
      .filter(Boolean);

    if (links.length === 0) {
      console.log(`⚠️  ${slug}: 연관 포스트 메타 없음, 스킵`);
      skipped++;
      continue;
    }

    const relatedBlock = { type: "relatedLinks", links };
    const newContent = [...content, relatedBlock];

    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ content: newContent })
      .eq("slug", slug);

    if (updateError) {
      console.log(`❌ ${slug}: 업데이트 실패 — ${updateError.message}`);
      failed++;
    } else {
      console.log(`✅ ${slug}: 관련글 ${links.length}개 추가`);
      success++;
    }
  }

  console.log(`\n완료: ✅ ${success}개 성공, ⏭️ ${skipped}개 스킵, ❌ ${failed}개 실패`);
}

run().catch((e) => { console.error(e); process.exit(1); });
