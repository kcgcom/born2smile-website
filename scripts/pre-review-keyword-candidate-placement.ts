import fs from "node:fs";
import path from "node:path";
import {
  getKeywordCandidateEvaluationData,
  saveKeywordCandidatePlacementPreReviews,
} from "../lib/keyword-candidate-evaluation-store";
import type { KeywordCategorySlug } from "../lib/admin-naver-datalab-keywords";

const PLACEMENTS: Record<string, { category: KeywordCategorySlug; subgroup: string }> = {
  "구강관리": { category: "prevention", subgroup: "구강위생" },
  "입안세균": { category: "prevention", subgroup: "구강위생" },
  "치주질환": { category: "prevention", subgroup: "잇몸질환/치료" },
  "치은절제술": { category: "prevention", subgroup: "잇몸질환/치료" },
};

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const evaluation = await getKeywordCandidateEvaluationData();
  const items = Object.entries(PLACEMENTS).map(([keyword, placement]) => {
    const item = evaluation.items.find((candidate) => candidate.keyword === keyword);
    if (!item) throw new Error(`평가 세트에서 키워드를 찾을 수 없습니다: ${keyword}`);
    return { id: item.id, keyword, ...placement };
  });
  if (!process.argv.includes("--apply")) {
    console.log({ mode: "preview", items });
    return;
  }
  const result = await saveKeywordCandidatePlacementPreReviews(
    items.map(({ id, category, subgroup }) => ({ id, category, subgroup })),
    "codex-pre-review",
  );
  console.log({ mode: "applied", ...result, items });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
