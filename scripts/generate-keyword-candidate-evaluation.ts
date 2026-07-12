import fs from "node:fs";
import path from "node:path";
import { isRelevantRelatedKeyword, type CategoryKeywords, type KeywordCategorySlug } from "../lib/admin-naver-datalab-keywords";
import { buildKeywordEvaluationSample, DEFAULT_EVALUATION_QUOTAS, type EvaluationPoolItem } from "../lib/keyword-candidate-evaluation";

const PRODUCT_OR_BRAND_PATTERN =
  /추천|셀프|세척|관리|운동|방지|치약|칫솔|칫솔모|세정제|세척기|제거제|사탕|영양제|케이스|오랄비|워터픽|아쿠아픽|오아구강|화이트랩스|오스템|덴티움|스트라우만|crest/i;
const LOCAL_OR_REGIONAL_PATTERN =
  /김포|고촌|한강신도시|장기동|풍무동|구래동|마산동|양촌|걸포동|운양동|사우동|감정동|송도|수성|수지|산본|마곡|연세.*치과/;

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

function normalize(keyword: string): string {
  return keyword.replace(/\s+/g, "").toLowerCase();
}

function buildPool(taxonomy: CategoryKeywords[], snapshot: Array<{ keyword: string; monthlyTotalQcCnt: number; isRelated: boolean }>): EvaluationPoolItem[] {
  const existing = new Set(taxonomy.flatMap((category) =>
    category.subGroups.flatMap((group) => group.keywords.map(normalize)),
  ));
  const targets = taxonomy.flatMap((category) => category.subGroups.map((group) => ({
    category: category.slug,
    subgroup: group.name,
    keywords: group.keywords.map(normalize),
  })));

  const deduped = new Map<string, EvaluationPoolItem>();
  for (const row of snapshot) {
    if (!row.isRelated || row.monthlyTotalQcCnt <= 0) continue;
    const normalized = normalize(row.keyword);
    let lexicalCategory: KeywordCategorySlug | null = null;
    let lexicalSubgroup: string | null = null;
    let lexicalScore = 0;
    for (const target of targets) {
      for (const core of target.keywords) {
        if (!normalized.includes(core) || normalized === core) continue;
        const score = core.length / normalized.length;
        if (score > lexicalScore) {
          lexicalCategory = target.category;
          lexicalSubgroup = target.subgroup;
          lexicalScore = score;
        }
      }
    }
    const previous = deduped.get(normalized);
    if (previous && previous.monthlyVolume >= row.monthlyTotalQcCnt) continue;
    deduped.set(normalized, {
      keyword: row.keyword,
      monthlyVolume: row.monthlyTotalQcCnt,
      lexicalCategory,
      lexicalSubgroup,
      lexicalScore,
      currentSurface: false,
      capHidden: false,
      passesBasicRelevance: isRelevantRelatedKeyword(row.keyword),
      productOrBrand: PRODUCT_OR_BRAND_PATTERN.test(row.keyword),
      localOrRegional: LOCAL_OR_REGIONAL_PATTERN.test(row.keyword),
      alreadyRegistered: existing.has(normalized),
    });
  }

  const eligible = [...deduped.values()]
    .filter((item) => !item.alreadyRegistered && item.passesBasicRelevance && item.lexicalScore >= 0.35 && item.monthlyVolume >= 100)
    .sort((a, b) => b.monthlyVolume - a.monthlyVolume);
  const subgroupCounts = new Map<string, number>();
  for (const item of eligible) {
    const key = `${item.lexicalCategory}:${item.lexicalSubgroup}`;
    const count = subgroupCounts.get(key) ?? 0;
    item.currentSurface = count < 5;
    item.capHidden = count >= 5;
    subgroupCounts.set(key, count + 1);
  }
  return [...deduped.values()];
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const [{ getActiveKeywordTaxonomy }, { getActiveSearchAdSnapshotRecord }] = await Promise.all([
    import("../lib/admin-keyword-taxonomy"),
    import("../lib/admin-searchad-snapshots"),
  ]);
  const [{ taxonomy, version }, snapshot] = await Promise.all([
    getActiveKeywordTaxonomy(),
    getActiveSearchAdSnapshotRecord(),
  ]);
  if (!snapshot) throw new Error("활성 SearchAd 스냅샷이 없습니다.");

  const pool = buildPool(taxonomy, snapshot.data);
  const items = buildKeywordEvaluationSample(pool);
  const expected = Object.values(DEFAULT_EVALUATION_QUOTAS).reduce((sum, quota) => sum + quota, 0);
  const counts = Object.fromEntries(Object.keys(DEFAULT_EVALUATION_QUOTAS).map((stratum) => [
    stratum,
    items.filter((item) => item.stratum === stratum).length,
  ]));
  if (items.length !== expected) {
    throw new Error(`평가 표본이 ${items.length}/${expected}개만 생성되었습니다: ${JSON.stringify(counts)}`);
  }

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taxonomyVersion: version,
    snapshotId: snapshot.id,
    snapshotCreatedAt: snapshot.createdAt,
    poolSize: pool.length,
    quotas: DEFAULT_EVALUATION_QUOTAS,
    counts,
    warning: "autoLabel은 초벌 제안이며 정답 라벨이 아닙니다. 운영 전 인간 검수가 필요합니다.",
    items,
  };
  const outputPath = path.resolve(process.cwd(), ".tmp/keyword-candidate-evaluation.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Generated ${items.length} evaluation items from ${pool.length} related keywords → ${path.relative(process.cwd(), outputPath)}`);
  console.log(counts);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
