import assert from "node:assert/strict";
import { triageKeywordCandidate } from "../lib/keyword-candidate-triage";

const base = { monthlyVolume: 2_000, seenCount: 5, seenInLatestSnapshot: true, subgroupExists: true };

assert.equal(triageKeywordCandidate({ ...base, keyword: "치과레진비용" }).kind, "approve-suggested");
assert.equal(triageKeywordCandidate({ ...base, keyword: "오랄비전동칫솔" }).kind, "defer-suggested");
assert.equal(triageKeywordCandidate({ ...base, keyword: "팔꿈치통증" }).kind, "exclude-suggested");
assert.equal(triageKeywordCandidate({ ...base, keyword: "치아건강", seenInLatestSnapshot: false }).kind, "defer-suggested");
assert.equal(triageKeywordCandidate({ ...base, keyword: "사랑니발치비용", subgroupExists: false }).kind, "reclassify");
assert.equal(triageKeywordCandidate({ ...base, keyword: "치아교정기간", monthlyVolume: 620 }).kind, "review");

console.log("Keyword candidate triage verified: 6 recommendation paths");
