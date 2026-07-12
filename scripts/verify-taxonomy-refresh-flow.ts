import assert from "node:assert/strict";
import { getTaxonomyDiffCount, getTaxonomyDiffLines, getTaxonomyRefreshPlan } from "../lib/admin-taxonomy-refresh";

assert.equal(getTaxonomyRefreshPlan({ pendingVersion: null, codeMatchesActive: true, codeMatchesPending: false }), "refresh");
assert.equal(getTaxonomyRefreshPlan({ pendingVersion: null, codeMatchesActive: false, codeMatchesPending: false }), "stage-and-refresh");
assert.equal(getTaxonomyRefreshPlan({ pendingVersion: 5, codeMatchesActive: false, codeMatchesPending: true }), "refresh-pending");
assert.equal(getTaxonomyRefreshPlan({ pendingVersion: 5, codeMatchesActive: false, codeMatchesPending: false }), "conflict");
assert.equal(getTaxonomyRefreshPlan({ pendingVersion: 5, codeMatchesActive: true, codeMatchesPending: false }), "conflict");

const diff = {
  addedKeywords: [{ category: "prevention" as const, subgroup: "구강관리제품", keyword: "워터픽" }],
  removedKeywords: [{ category: "prevention" as const, subgroup: "구강위생", keyword: "워터픽" }],
  addedSubgroups: [{ category: "prevention" as const, subgroup: "구강관리제품" }],
  removedSubgroups: [],
};

assert.deepEqual(getTaxonomyDiffCount(diff), { added: 2, removed: 1 });
assert.deepEqual(getTaxonomyDiffLines(diff, () => "예방관리"), [
  "+ 새 서브그룹: 예방관리 / 구강관리제품",
  "+ 키워드: 예방관리 / 구강관리제품 / 워터픽",
  "- 키워드: 예방관리 / 구강위생 / 워터픽",
]);

console.log("Taxonomy refresh flow verified: 5 state combinations and diff preview");
