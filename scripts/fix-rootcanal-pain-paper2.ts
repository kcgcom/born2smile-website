/**
 * root-canal-pain-reality 페이지의 두 번째 논문(endopain-mgmt-2022) 교체
 * Di Spirito 2022 (약물 비교 논문) → Torabinejad 2011 (통증 타임라인 메타분석)
 * PMID: 21419285
 * Run: npx dotenv-cli -e .env.local -- npx tsx scripts/fix-rootcanal-pain-paper2.ts
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const SLUG = "root-canal-pain-reality";

// 교체할 새 논문 데이터
const newPaper = {
  id: "torabinejad-2011",
  year: 2011,
  title: "Pain prevalence and severity before, during, and after root canal treatment: a systematic review",
  journal: "Journal of Endodontics",
  titleKo: "신경치료 전·중·후 통증 유병률과 강도: 72개 임상연구 체계적 문헌고찰",
  pubmedUrl: "https://pubmed.ncbi.nlm.nih.gov/21419285/",
  sampleSize: "72개 임상연구 체계적 문헌고찰·메타분석",
  keyFindings: [
    {
      stat: "60%",
      label: "시술 후 24시간이면 통증 없음",
      context: "VAS 기반 — 나머지도 대부분 경미한 수준으로 감소",
    },
    {
      stat: "89%",
      label: "시술 후 7일이면 통증 없음",
      context: "VAS 통증 점수: 시술 전 54점 → 24시간 후 24점 → 7일 후 5점으로 감소",
    },
  ],
  summary:
    "72개 임상연구를 종합 분석한 대규모 체계적 문헌고찰입니다. 신경치료 시술 전 환자의 VAS 평균 통증 점수는 54점이었지만, 시술 후 24시간이면 60%의 환자가 통증 없는 상태가 되고 24점으로 감소합니다. 7일이 지나면 89%의 환자가 통증을 느끼지 않으며 VAS 5점(거의 없음) 수준으로 회복됩니다.",
  clinicalNote:
    "신경치료 후 통증은 대부분 수일 안에 해소됩니다. 24시간 이내에는 이부프로펜 등 진통제를 적절히 복용하고, 1주일이 지나도 강한 통증이 지속된다면 담당 치과에 연락해야 하는 신호입니다.",
};

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 현재 데이터 조회
  const { data, error } = await supabase
    .from("research_pages")
    .select("data")
    .eq("slug", SLUG)
    .single();

  if (error || !data) {
    console.error("조회 실패:", error);
    process.exit(1);
  }

  const page = data.data as { papers: Array<{ id: string }> };
  const oldPaperIndex = page.papers.findIndex((p) => p.id === "endopain-mgmt-2022");

  if (oldPaperIndex === -1) {
    console.error("교체 대상 논문(endopain-mgmt-2022)을 찾을 수 없습니다.");
    process.exit(1);
  }

  const updatedPapers = [...page.papers];
  updatedPapers[oldPaperIndex] = newPaper;

  const updatedPage = { ...page, papers: updatedPapers };

  const { error: updateError } = await supabase
    .from("research_pages")
    .update({ data: updatedPage, updated_at: new Date().toISOString() })
    .eq("slug", SLUG);

  if (updateError) {
    console.error("업데이트 실패:", updateError);
    process.exit(1);
  }

  console.log("✅ 두 번째 논문 교체 완료:");
  console.log("   이전: endopain-mgmt-2022 (Di Spirito 2022 — 약물 비교)");
  console.log("   이후: torabinejad-2011 (통증 타임라인 메타분석, PMID 21419285)");
}

main();
