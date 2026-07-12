import assert from "node:assert/strict";
import { buildKeywordEvaluationSample, type EvaluationPoolItem } from "../lib/keyword-candidate-evaluation";

const item = (keyword: string, overrides: Partial<EvaluationPoolItem> = {}): EvaluationPoolItem => ({
  keyword,
  monthlyVolume: 1_000,
  lexicalCategory: "implant",
  lexicalSubgroup: "비용/가격",
  lexicalScore: 0.5,
  currentSurface: false,
  capHidden: false,
  passesBasicRelevance: true,
  productOrBrand: false,
  localOrRegional: false,
  alreadyRegistered: false,
  ...overrides,
});

const sample = buildKeywordEvaluationSample([
  item("현재후보", { currentSurface: true }),
  item("숨은후보", { capHidden: true }),
  item("저검색량", { monthlyVolume: 50 }),
  item("문자열탈락", { lexicalCategory: null, lexicalSubgroup: null, lexicalScore: 0.1 }),
  item("제품후보", { productOrBrand: true }),
  item("지역후보", { localOrRegional: true }),
  item("노이즈", { passesBasicRelevance: false }),
], {
  "current-surface": 1,
  "cap-hidden": 1,
  "lexical-low-volume": 1,
  "lexical-missed": 1,
  "product-brand": 1,
  "local-regional": 1,
  "noise-uncertain": 1,
});

assert.equal(sample.length, 7);
assert.equal(new Set(sample.map((candidate) => candidate.keyword)).size, 7);
assert.deepEqual(new Set(sample.map((candidate) => candidate.stratum)), new Set([
  "current-surface", "cap-hidden", "lexical-low-volume", "lexical-missed", "product-brand", "local-regional", "noise-uncertain",
]));
assert.equal(sample.find((candidate) => candidate.keyword === "제품후보")?.autoLabel.purpose, "product");
assert.equal(sample.find((candidate) => candidate.keyword === "노이즈")?.autoLabel.action, "reject");

console.log("Keyword candidate evaluation sampling verified: 7 strata");
