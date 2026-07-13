import fs from "node:fs";
import path from "node:path";
import {
  getKeywordCandidateEvaluationData,
  saveKeywordCandidateRelevancePreReviews,
} from "../lib/keyword-candidate-evaluation-store";
import type { EvaluationRelevance } from "../lib/keyword-candidate-evaluation";

const IRRELEVANT_KEYWORDS = new Set([
  "지르코니아볼", "에어플로우센서", "엉치통증", "자율신경치료", "피부과스케일링", "지르코니아가공",
  "간호사책", "코감기빨리낫는법", "산화알루미늄", "THREEBOND", "척추협착증", "허리측만증", "금속보수제",
  "락앤락반찬용기", "세라믹기판", "NAVIGATION", "프롤로주사치료", "캐논계산기", "의료사고전문변호사",
  "접이식노트북거치대", "토끼표본드", "바이컬러", "비염", "세탁기육가", "붓", "얼굴지방흡입", "의료소송",
  "자가진피코성형", "안면윤곽3종", "건망증치료", "호흡기", "옆광대축소", "TID", "이명소리", "어지럽다", "천연오일",
  "재활병원추천", "나사풀림방지액", "수성로라", "테프론수지", "수성바인더", "페인트붓", "실리콘건",
  "도전성접착제", "석재용에폭시", "실리콘고무패킹", "고온실리콘", "배관인서트", "폴리비닐알콜", "페인트용품",
  "유진실리콘", "접착본드", "HTV실리콘", "아이소핑크접착제", "실리콘패드가공", "백색실리콘", "실리콘금형",
  "초산형실리콘", "만능접착제",
]);

const UNCERTAIN_KEYWORDS = new Set<string>();

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
  if (evaluation.items.length !== 300) throw new Error(`평가 세트가 300개가 아닙니다: ${evaluation.items.length}`);

  const available = new Set(evaluation.items.map((item) => item.keyword));
  const unknownOverrides = [...IRRELEVANT_KEYWORDS, ...UNCERTAIN_KEYWORDS].filter((keyword) => !available.has(keyword));
  if (unknownOverrides.length > 0) throw new Error(`평가 세트에서 찾을 수 없는 검토 키워드: ${unknownOverrides.join(", ")}`);

  const reviews = evaluation.items.map((item) => ({
    id: item.id,
    relevance: (IRRELEVANT_KEYWORDS.has(item.keyword)
      ? "irrelevant"
      : UNCERTAIN_KEYWORDS.has(item.keyword)
        ? "uncertain"
        : "relevant") as EvaluationRelevance,
  }));
  const counts = Object.fromEntries(["relevant", "uncertain", "irrelevant"].map((value) => [
    value,
    reviews.filter((review) => review.relevance === value).length,
  ]));
  if (!process.argv.includes("--apply")) {
    console.log({ mode: "preview", counts });
    return;
  }
  const result = await saveKeywordCandidateRelevancePreReviews(reviews, "codex-pre-review");
  console.log({ mode: "applied", ...result, counts });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
