import assert from "node:assert/strict";
import { KEYWORD_CANDIDATE_BATCH_LIMIT, triageKeywordCandidate, validateKeywordCandidateBatchSize } from "../lib/keyword-candidate-triage";

const base = { monthlyVolume: 2_000, seenCount: 5, seenInLatestSnapshot: true, subgroupExists: true };

assert.equal(triageKeywordCandidate({ ...base, keyword: "치과레진비용" }).kind, "approve-suggested");
assert.equal(triageKeywordCandidate({ ...base, keyword: "오랄비전동칫솔" }).kind, "defer-suggested");
assert.equal(triageKeywordCandidate({ ...base, keyword: "오스템임플란트가격" }).kind, "defer-suggested");
assert.equal(triageKeywordCandidate({ ...base, keyword: "셀프치아미백" }).kind, "defer-suggested");
assert.equal(triageKeywordCandidate({ ...base, keyword: "팔꿈치통증" }).kind, "exclude-suggested");
assert.equal(triageKeywordCandidate({ ...base, keyword: "치아건강", seenInLatestSnapshot: false }).kind, "defer-suggested");
assert.equal(triageKeywordCandidate({ ...base, keyword: "사랑니발치비용", subgroupExists: false }).kind, "reclassify");
assert.equal(triageKeywordCandidate({ ...base, keyword: "치아교정기간", monthlyVolume: 620 }).kind, "review");
assert.equal(triageKeywordCandidate({ ...base, keyword: "송도어린이치과" }).kind, "review");
assert.equal(triageKeywordCandidate({ ...base, keyword: "연세어린이치과" }).kind, "review");
assert.equal(triageKeywordCandidate({ ...base, keyword: "안면비대칭교정" }).kind, "review");
assert.equal(KEYWORD_CANDIDATE_BATCH_LIMIT, 500);
assert.doesNotThrow(() => validateKeywordCandidateBatchSize(107));
assert.throws(() => validateKeywordCandidateBatchSize(501), /1~500개/);

console.log("Keyword candidate triage verified: 11 recommendation cases and batch limit");
