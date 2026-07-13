import fs from "node:fs";
import path from "node:path";
import {
  getKeywordCandidateEvaluationData,
  saveKeywordCandidatePurposePreReviews,
} from "../lib/keyword-candidate-evaluation-store";
import type { EvaluationPurpose } from "../lib/keyword-candidate-evaluation";

const LOCAL_PATTERN =
  /서울|검단|송도|연산동|영통|오산|인천|대구|수원|부천|일산|부산|온천|구월동|구의역|건대|주엽역|청담동|반석동|고촌|한강신도시|장기동|풍무동|구래동|마산동|양촌|걸포동|운양동|사우동|감정동|금천|김포|수성|마곡|수지구청|미금역|양산|강남|분당|아산|나성동|강북구|세종|부평구|울산|에스바른치과|더화이트치과|연세.*치과/;
const PRODUCT_PATTERN =
  /워터픽|아쿠아픽|AQUAPICK|오랄비|필립스|큐라덴|메디메이트|알로코리아|브라운|비타할로|오아|이지숨|치간칫솔|구강세정기|칫솔|치약|캔디|스프레이|세척제|세정제|세척기|살균|세정컵|가글|영양제|유산균|구취측정기|마우스가드|마우스피스|쿠션코렉트|덴텍치실|양치컵|인사돌|AQ350|WF10K|구강청결제|셀프치석|셀프스케일링|치석제거|입냄새.*약|구취제거약|시린이약|치주염치료약|오스템|네오임플란트|짐머임플란트|인비절라인퍼스트/;
const FAQ_KEYWORDS = new Set([
  "이가시린이유", "입냄새제거방법", "틀니사용법", "깨진이빨", "턱빠짐", "치실냄새", "잇몸냄새",
  "입마름증상",
  "인레이판매",
]);
const CONTENT_KEYWORDS = new Set([
  "앞니임플란트후기", "안면비대칭교정방법", "베이킹소다치아미백", "입냄새한의원", "안면비대칭교정후기",
  "치아미백레이저", "돌출입투명교정", "임플란트보험추천", "금니판매",
  "치과보험청구서류", "치아보험청구", "돌출입수술", "임플란트수면마취",
]);

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

function reviewPurpose(item: Awaited<ReturnType<typeof getKeywordCandidateEvaluationData>>["items"][number]): EvaluationPurpose {
  const relevance = item.relevancePreReview?.relevance;
  if (relevance === "irrelevant") return "noise";
  if (relevance === "uncertain") return "unknown";
  if (LOCAL_PATTERN.test(item.keyword)) return "local";
  if (CONTENT_KEYWORDS.has(item.keyword)) return "content";
  if (FAQ_KEYWORDS.has(item.keyword)) return "faq";
  if (PRODUCT_PATTERN.test(item.keyword)) return "product";
  return "taxonomy";
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const evaluation = await getKeywordCandidateEvaluationData();
  if (evaluation.items.length !== 300) throw new Error(`평가 세트가 300개가 아닙니다: ${evaluation.items.length}`);
  if (evaluation.items.some((item) => !item.relevancePreReview)) throw new Error("관련성 사전 검토를 먼저 완료해야 합니다.");

  const reviews = evaluation.items.map((item) => ({ id: item.id, purpose: reviewPurpose(item) }));
  const purposes: EvaluationPurpose[] = ["taxonomy", "content", "faq", "product", "local", "noise", "unknown"];
  const counts = Object.fromEntries(purposes.map((purpose) => [purpose, reviews.filter((review) => review.purpose === purpose).length]));
  const examples = Object.fromEntries(purposes.map((purpose) => [purpose, evaluation.items
    .filter((item) => reviews.find((review) => review.id === item.id)?.purpose === purpose)
    .slice(0, 8)
    .map((item) => item.keyword)]));
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "preview", counts, examples }, null, 2));
    return;
  }
  const result = await saveKeywordCandidatePurposePreReviews(reviews, "codex-pre-review");
  console.log({ mode: "applied", ...result, counts });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
