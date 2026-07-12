import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type ExpectedResult = "merge" | "separate";

type EvaluationCase = {
  a: string;
  b: string;
  expected: ExpectedResult;
  reason: string;
};

type GroupCase = {
  name: string;
  clusters: string[][];
};

type RepresentativeCase = {
  name: string;
  queries: string[];
  expected: string;
  impressions?: Record<string, number>;
};

const CASES: EvaluationCase[] = [
  { a: "임플란트 가격", b: "임플란트 비용", expected: "merge", reason: "가격 동의어" },
  { a: "김포 임플란트", b: "김포 임플란트 치과", expected: "merge", reason: "지역·시술 의도 동일" },
  { a: "앞니 임플란트 비용", b: "앞니 임플란트 가격", expected: "merge", reason: "부위·가격 의도 동일" },
  { a: "신경치료 통증", b: "신경 치료 통증", expected: "merge", reason: "띄어쓰기 변형" },
  { a: "치아 교정 가격", b: "교정 비용", expected: "merge", reason: "교정 가격 의도 동일" },
  { a: "사랑니 발치 통증", b: "사랑니 뽑을 때 통증", expected: "merge", reason: "발치 표현 변형" },
  { a: "스케일링 가격", b: "스케일링 비용", expected: "merge", reason: "가격 동의어" },
  { a: "잇몸 치료", b: "치주 치료", expected: "merge", reason: "진료 표현 유사" },
  { a: "임플란트 가격", b: "임플란트 통증", expected: "separate", reason: "가격과 통증 의도 분리" },
  { a: "임플란트 수명", b: "임플란트 부작용", expected: "separate", reason: "수명과 부작용 의도 분리" },
  { a: "신경치료 비용", b: "충치 치료 비용", expected: "separate", reason: "진료 범위 분리" },
  { a: "치아교정 비용", b: "임플란트 비용", expected: "separate", reason: "서로 다른 시술" },
  { a: "사랑니 발치", b: "스케일링 비용", expected: "separate", reason: "서로 다른 진료" },
  { a: "잇몸 출혈", b: "턱관절 통증", expected: "separate", reason: "증상 부위 분리" },
  { a: "어린이 충치", b: "성인 임플란트", expected: "separate", reason: "대상·진료 분리" },
  { a: "치아 미백 가격", b: "라미네이트 가격", expected: "separate", reason: "심미 시술 종류 분리" },
  { a: "인레이 후 식사", b: "인레이 치료 후 식사", expected: "merge", reason: "실제 SC · 치료 후 식사" },
  { a: "인레이 후 식사", b: "인레이 당일 식사", expected: "merge", reason: "실제 SC · 당일 식사" },
  { a: "인레이 후 식사", b: "인레이 치료 시간", expected: "separate", reason: "실제 SC · 식사와 치료 시간" },
  { a: "레진치료 후 식사", b: "레진 치료 후 식사", expected: "merge", reason: "실제 SC · 띄어쓰기 변형" },
  { a: "레진 치료 후 식사", b: "레진치료후 식사", expected: "merge", reason: "실제 SC · 복합어 띄어쓰기" },
  { a: "레진 후 식사", b: "레진하고 식사", expected: "merge", reason: "실제 SC · 구어체 변형" },
  { a: "레진치료 후 식사", b: "충치 치료 후 식사", expected: "separate", reason: "실제 SC · 치료 종류 분리" },
  { a: "지르코니아 크라운 수명", b: "지르코니아 수명", expected: "merge", reason: "실제 SC · 재료 수명" },
  { a: "치아 크라운 수명", b: "골드 크라운 수명", expected: "merge", reason: "실제 SC · 상위 크라운 수명 주제" },
  { a: "지르코니아 크라운 수명", b: "pfm 크라운 수명", expected: "separate", reason: "실제 SC · 크라운 재료 분리" },
  { a: "pfm 크라운", b: "pfm크라운", expected: "merge", reason: "실제 SC · 띄어쓰기 변형" },
  { a: "pfm 뜻", b: "pfm 크라운", expected: "separate", reason: "실제 SC · 정의와 제품 정보" },
  { a: "골드 크라운", b: "골드크라운", expected: "merge", reason: "실제 SC · 띄어쓰기 변형" },
  { a: "크라운 이물감", b: "크라운 치아 삭제량", expected: "separate", reason: "실제 SC · 증상과 삭제량" },
  { a: "dentist near me", b: "dentists near me", expected: "merge", reason: "실제 SC · 영문 단복수" },
  { a: "dentist near me", b: "pediatric near me", expected: "separate", reason: "실제 SC · 일반과 소아 진료" },
];

const GROUP_CASES: GroupCase[] = [
  {
    name: "임플란트 검색 의도",
    clusters: [
      ["임플란트 가격", "임플란트 비용", "김포 임플란트 가격"],
      ["임플란트 통증"],
      ["임플란트 수명"],
      ["임플란트 부작용"],
    ],
  },
  {
    name: "치아교정 검색 의도",
    clusters: [
      ["치아 교정 가격", "교정 비용", "치아교정 비용"],
      ["치아교정 기간"],
      ["치아교정 통증"],
      ["투명교정 종류"],
    ],
  },
  {
    name: "신경치료 표기와 의도",
    clusters: [
      ["신경치료 통증", "신경 치료 통증"],
      ["신경치료 비용", "신경 치료 가격"],
      ["충치 치료 비용"],
    ],
  },
  {
    name: "지역 검색 의도",
    clusters: [
      ["김포 임플란트", "김포 임플란트 치과", "김포시 임플란트"],
      ["검단 임플란트", "검단 임플란트 치과"],
      ["김포 치아교정"],
    ],
  },
  {
    name: "진료 종류 분리",
    clusters: [
      ["스케일링 가격", "스케일링 비용"],
      ["사랑니 발치", "사랑니 발치 통증"],
      ["치아 미백 가격"],
      ["라미네이트 가격"],
      ["턱관절 통증"],
    ],
  },
  {
    name: "실제 SC · 인레이 식사",
    clusters: [
      ["인레이 후 식사", "인레이 임시 충전재 식사", "인레이 치료 후 식사", "인레이 당일 식사", "인레이 식사"],
      ["인레이 치료 시간"],
    ],
  },
  {
    name: "실제 SC · 레진 식사",
    clusters: [
      ["레진치료 후 식사", "레진 치료 후 식사", "레진치료후 식사", "레진 치료후 식사", "레진 후 식사", "레진하고 식사"],
      ["충치 치료 후 식사"],
      ["gi 치료 후 식사"],
    ],
  },
  {
    name: "실제 SC · 크라운 재료",
    clusters: [
      ["지르코니아 크라운 수명", "지르코니아 수명"],
      ["pfm 크라운 수명"],
      ["치아 크라운 수명", "골드 크라운 수명"],
      ["pfm 크라운", "pfm크라운"],
      ["골드 크라운", "골드크라운"],
      ["크라운 이물감"],
      ["크라운 치아 삭제량"],
    ],
  },
  {
    name: "실제 SC · 영문 주변 치과",
    clusters: [
      ["dentist near me", "dentists near me", "dental clinic near me"],
      ["pediatric near me"],
      ["prosthodontist"],
    ],
  },
];

const REPRESENTATIVE_CASES: RepresentativeCase[] = [
  {
    name: "크라운 상위 주제",
    queries: ["치아 크라운 수명", "골드 크라운 수명"],
    expected: "치아 크라운 수명",
    impressions: { "치아 크라운 수명": 5, "골드 크라운 수명": 1 },
  },
  {
    name: "지역 임플란트",
    queries: ["김포 임플란트", "김포 임플란트 치과", "김포시 임플란트"],
    expected: "김포 임플란트",
  },
  {
    name: "PFM 띄어쓰기",
    queries: ["pfm 크라운", "pfm크라운"],
    expected: "pfm 크라운",
    impressions: { "pfm 크라운": 83, "pfm크라운": 6 },
  },
  {
    name: "임플란트 가격",
    queries: ["임플란트 가격", "임플란트 비용", "김포 임플란트 가격"],
    expected: "임플란트 가격",
  },
];

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseThreshold(): number | undefined {
  const argument = process.argv.find((item) => item.startsWith("--threshold="));
  if (!argument) return undefined;
  const value = Number(argument.slice("--threshold=".length));
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("--threshold는 0~1 사이의 숫자여야 합니다.");
  }
  return value;
}

function scoreGroups(expected: string[][], actual: string[][]) {
  const expectedGroup = new Map<string, number>();
  const actualGroup = new Map<string, number>();
  expected.forEach((cluster, group) => cluster.forEach((query) => expectedGroup.set(query, group)));
  actual.forEach((cluster, group) => cluster.forEach((query) => actualGroup.set(query, group)));

  const queries = Array.from(expectedGroup.keys());
  let correct = 0;
  let total = 0;
  let falseMerges = 0;
  let missedMerges = 0;
  for (let i = 0; i < queries.length; i++) {
    for (let j = i + 1; j < queries.length; j++) {
      const expectedSame = expectedGroup.get(queries[i]) === expectedGroup.get(queries[j]);
      const actualSame = actualGroup.get(queries[i]) === actualGroup.get(queries[j]);
      total++;
      if (expectedSame === actualSame) correct++;
      else if (actualSame) falseMerges++;
      else missedMerges++;
    }
  }
  return { correct, total, falseMerges, missedMerges };
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

async function main() {
  const {
    GEMINI_EMBEDDING_MODEL,
    KEYWORD_CLUSTER_THRESHOLD,
    KEYWORD_EMBEDDING_DIMS,
    KEYWORD_MIN_TOKEN_JACCARD,
    clusterKeywordQueriesForEvaluation,
    embedKeywordsForClustering,
    shouldMergeKeywordPair,
  } = await import("../lib/admin-keyword-embeddings");

  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const threshold = parseThreshold() ?? KEYWORD_CLUSTER_THRESHOLD;
  const keywords = Array.from(new Set([
    ...CASES.flatMap(({ a, b }) => [a, b]),
    ...GROUP_CASES.flatMap(({ clusters }) => clusters.flat()),
    ...REPRESENTATIVE_CASES.flatMap(({ queries }) => queries),
  ]));
  const vectors = await embedKeywordsForClustering(keywords);

  if (vectors.length !== keywords.length) {
    throw new Error(`임베딩 개수 불일치: 요청 ${keywords.length}, 응답 ${vectors.length}`);
  }

  const embeddings = new Map(keywords.map((keyword, index) => [keyword, vectors[index]]));
  const results = CASES.map((testCase) => {
    const embeddingA = embeddings.get(testCase.a);
    const embeddingB = embeddings.get(testCase.b);
    if (!embeddingA || !embeddingB) throw new Error("평가 임베딩이 누락되었습니다.");

    const metrics = shouldMergeKeywordPair(
      testCase.a,
      testCase.b,
      embeddingA,
      embeddingB,
      threshold,
    );
    const actual: ExpectedResult = metrics.merge ? "merge" : "separate";
    return {
      A: testCase.a,
      B: testCase.b,
      cosine: metrics.similarity.toFixed(4),
      jaccard: metrics.tokenJaccard.toFixed(3),
      expected: testCase.expected,
      actual,
      result: actual === testCase.expected ? "PASS" : "FAIL",
      reason: testCase.reason,
    };
  });

  const passed = results.filter(({ result }) => result === "PASS").length;
  const falseMerges = results.filter(
    ({ expected, actual }) => expected === "separate" && actual === "merge",
  ).length;
  const missedMerges = results.filter(
    ({ expected, actual }) => expected === "merge" && actual === "separate",
  ).length;

  console.log(
    `\n${GEMINI_EMBEDDING_MODEL} · ${KEYWORD_EMBEDDING_DIMS}d · cosine >= ${threshold} · token Jaccard >= ${KEYWORD_MIN_TOKEN_JACCARD}\n`,
  );
  console.table(results);
  console.log(
    `품질: ${passed}/${results.length} (${((passed / results.length) * 100).toFixed(1)}%) · 오병합 ${falseMerges} · 누락 병합 ${missedMerges}`,
  );

  const embeddingRecord = Object.fromEntries(embeddings);
  const groupResults = GROUP_CASES.map((groupCase) => {
    const queries = groupCase.clusters.flat();
    const actual = clusterKeywordQueriesForEvaluation(queries, embeddingRecord, threshold);
    const score = scoreGroups(groupCase.clusters, actual);
    return {
      group: groupCase.name,
      accuracy: `${score.correct}/${score.total}`,
      falseMerges: score.falseMerges,
      missedMerges: score.missedMerges,
      actual: actual.map((cluster) => cluster.join(" · ")).join(" | "),
    };
  });
  console.log("\n그룹 단위 평가");
  console.table(groupResults);

  const representativeResults = REPRESENTATIVE_CASES.map((testCase) => {
    const clusters = clusterKeywordQueriesForEvaluation(
      testCase.queries,
      embeddingRecord,
      threshold,
      testCase.impressions,
    );
    const cluster = clusters.find((candidate) => candidate.includes(testCase.expected));
    const actual = cluster?.[0] ?? "없음";
    return {
      group: testCase.name,
      expected: testCase.expected,
      actual,
      result: actual === testCase.expected ? "PASS" : "FAIL",
    };
  });
  console.log("\n대표주제어 평가");
  console.table(representativeResults);

  const sweep = Array.from({ length: 11 }, (_, index) => 0.88 + index * 0.01).map(
    (candidate) => {
      let pairCorrect = 0;
      let groupCorrect = 0;
      let groupTotal = 0;
      let totalFalseMerges = 0;
      let totalMissedMerges = 0;

      for (const testCase of CASES) {
        const metrics = shouldMergeKeywordPair(
          testCase.a,
          testCase.b,
          embeddings.get(testCase.a)!,
          embeddings.get(testCase.b)!,
          candidate,
        );
        const actual: ExpectedResult = metrics.merge ? "merge" : "separate";
        if (actual === testCase.expected) pairCorrect++;
        else if (actual === "merge") totalFalseMerges++;
        else totalMissedMerges++;
      }

      for (const groupCase of GROUP_CASES) {
        const queries = groupCase.clusters.flat();
        const actual = clusterKeywordQueriesForEvaluation(queries, embeddingRecord, candidate);
        const score = scoreGroups(groupCase.clusters, actual);
        groupCorrect += score.correct;
        groupTotal += score.total;
        totalFalseMerges += score.falseMerges;
        totalMissedMerges += score.missedMerges;
      }

      const totalDecisions = CASES.length + groupTotal;
      const correct = pairCorrect + groupCorrect;
      const weightedErrors = totalFalseMerges * 2 + totalMissedMerges;
      return {
        threshold: candidate.toFixed(2),
        accuracy: `${((correct / totalDecisions) * 100).toFixed(1)}%`,
        falseMerges: totalFalseMerges,
        missedMerges: totalMissedMerges,
        weightedErrors,
      };
    },
  );
  const bestWeightedErrors = Math.min(...sweep.map(({ weightedErrors }) => weightedErrors));
  console.log("\n임계값 자동 비교 (오병합 가중치 2배)");
  console.table(
    sweep.map((row) => ({
      ...row,
      recommendation: row.weightedErrors === bestWeightedErrors ? "BEST" : "",
    })),
  );

  if (process.argv.includes("--strict") && passed !== results.length) {
    process.exitCode = 1;
  }
}

void main();
