import fs from "node:fs";
import path from "node:path";
import type { HumanEvaluationLabel } from "../lib/keyword-candidate-evaluation";
import {
  getKeywordCandidateBoundaryReviewData,
  saveKeywordCandidateBoundaryReviewPreReviews,
} from "../lib/keyword-candidate-boundary-review-store";

type Draft = Omit<HumanEvaluationLabel, "updatedAt" | "updatedBy">;

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

function relevant(purpose: "product" | "local"): Draft {
  return { relevance: "relevant", purpose, action: "approve", category: null, subgroup: null, notes: "" };
}

function noise(notes: string): Draft {
  return { relevance: "irrelevant", purpose: "noise", action: "reject", category: null, subgroup: null, notes };
}

function uncertain(notes: string): Draft {
  return { relevance: "uncertain", purpose: "unknown", action: "review", category: null, subgroup: null, notes };
}

const REVIEWS: Record<string, Draft> = {
  "대전치아교정추천": relevant("local"),
  "구강호흡방지테이프": relevant("product"),
  "아로마오일": noise("구강 전용이 아닌 일반 아로마 제품 탐색어"),
  "매꾸라": noise("배관 마감용 플러그·캡 탐색어"),
  "다엘바": uncertain("제품명 또는 오타 가능성이 있으나 치과 관련 근거를 확인하기 어려움"),
  "발작": noise("치과보다 신경계 증상 검색 의도가 우세함"),
  "숙면아로마": noise("수면용 아로마 제품 탐색어"),
  "거울카드": noise("치과 관련성이 확인되지 않는 교구·상품 탐색어"),
  "내화": noise("방화·내열 소재 의미가 우세함"),
  "HYDRIODICACID": noise("요오드화수소산 화학 물질 탐색어"),
  "스트레스검사": noise("일반 정신건강·건강검진 의도가 우세함"),
  "나사실링": noise("산업용 나사 밀봉 탐색어"),
  "디웰바": uncertain("제품명 또는 오타 가능성이 있으나 치과 관련 근거를 확인하기 어려움"),
  "QUERCETIN": noise("일반 영양성분 퀘르세틴 탐색어"),
  "디월바": uncertain("제품명 또는 오타 가능성이 있으나 치과 관련 근거를 확인하기 어려움"),
  "임마클": uncertain("브랜드·축약어 가능성이 있으나 검색 의도를 확정하기 어려움"),
  "비맥": noise("일반 비타민·영양제 브랜드 탐색 의도가 우세함"),
  "GAN": noise("전자·AI 분야 약어 등 비치과 의미가 우세함"),
  "JB.LAB": noise("오디오·전자제품 브랜드 탐색 의도가 우세함"),
  "써봐": noise("구체적인 치과 검색 의도가 없는 일반 표현"),
  "슬립바": uncertain("수면 관련 제품명 가능성이 있으나 구강 전용 여부가 불명확함"),
  "웰바": uncertain("브랜드·제품명 가능성이 있으나 치과 관련 근거를 확인하기 어려움"),
  "ZOC": noise("자동차 색상 코드 등 비치과 약어 의미가 확인됨"),
  "ACNE": noise("여드름·피부과 검색어"),
  "일반모": uncertain("칫솔모 유형일 수 있으나 단독 표현만으로 구강 제품 의도를 확정하기 어려움"),
  "바륨": noise("화학 원소·조영제 탐색어"),
  "ZFM": noise("자동차 색상 코드 등 비치과 약어 의미가 확인됨"),
  "SCHMIDT": uncertain("인명·브랜드가 혼재해 치과 검색 의도를 확정하기 어려움"),
  "CVDSIC": uncertain("축약어 또는 코드로 보이며 의미를 확인하기 어려움"),
  "2311": noise("치과 관련 근거가 없는 단독 숫자 검색어"),
};

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const review = await getKeywordCandidateBoundaryReviewData();
  const keywords = new Set(review.items.map((item) => item.keyword));
  const missing = review.items.filter((item) => !REVIEWS[item.keyword]).map((item) => item.keyword);
  const extras = Object.keys(REVIEWS).filter((keyword) => !keywords.has(keyword));
  if (missing.length > 0 || extras.length > 0) {
    throw new Error(`경계 큐 불일치: missing=${missing.join(",")}; extras=${extras.join(",")}`);
  }
  const result = await saveKeywordCandidateBoundaryReviewPreReviews(
    review.items.map((item) => ({ id: item.id, label: REVIEWS[item.keyword] })),
    `assistant-assisted-pre-review:${review.engineVersion}`,
  );
  const counts = Object.fromEntries(["local", "product", "noise", "unknown"].map((purpose) => [
    purpose,
    Object.values(REVIEWS).filter((draft) => draft.purpose === purpose).length,
  ]));
  console.log(JSON.stringify({ ...result, counts }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
