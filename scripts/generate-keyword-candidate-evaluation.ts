import fs from "node:fs";
import path from "node:path";
import { buildKeywordEvaluationPool, buildKeywordEvaluationSample, DEFAULT_EVALUATION_QUOTAS } from "../lib/keyword-candidate-evaluation";

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
  const [{ getActiveKeywordTaxonomy }, { getActiveSearchAdSnapshotRecord }] = await Promise.all([
    import("../lib/admin-keyword-taxonomy"),
    import("../lib/admin-searchad-snapshots"),
  ]);
  const [{ taxonomy, version }, snapshot] = await Promise.all([
    getActiveKeywordTaxonomy(),
    getActiveSearchAdSnapshotRecord(),
  ]);
  if (!snapshot) throw new Error("활성 SearchAd 스냅샷이 없습니다.");

  const pool = buildKeywordEvaluationPool(taxonomy, snapshot.data);
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
