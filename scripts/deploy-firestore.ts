/**
 * Deploy Firestore indexes and rules using Admin SDK credentials.
 * Usage: npx tsx scripts/deploy-firestore.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ID = "seoul-born2smile";
const DATABASE = "(default)";

// --- Init credentials ---
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "/tmp/sa-key.json";
const key = JSON.parse(readFileSync(keyPath, "utf8"));
const app = initializeApp({ credential: cert(key), projectId: PROJECT_ID });

// Get access token from Admin SDK credential
async function getAccessToken(): Promise<string> {
  const credential = app.options.credential!;
  const token = await credential.getAccessToken();
  return token.access_token;
}

// --- Deploy Indexes ---
async function deployIndexes() {
  const indexesFile = resolve(__dirname, "../firestore.indexes.json");
  const { indexes } = JSON.parse(readFileSync(indexesFile, "utf8"));
  const token = await getAccessToken();

  console.log(`\n📋 Deploying ${indexes.length} indexes...`);

  // First, list existing indexes
  const listRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/collectionGroups/-/indexes`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const existing = await listRes.json();
  const existingIndexes = (existing.indexes || []) as Array<{
    fields: Array<{ fieldPath: string; order?: string }>;
    queryScope: string;
    state: string;
    name: string;
  }>;

  console.log(`  기존 인덱스: ${existingIndexes.length}개`);

  for (const idx of indexes) {
    const collectionGroup = idx.collectionGroup as string;
    const fields = idx.fields as Array<{ fieldPath: string; order: string }>;

    // Check if index already exists
    const alreadyExists = existingIndexes.some(
      (ei) =>
        ei.queryScope === "COLLECTION" &&
        ei.fields &&
        ei.fields.length === fields.length &&
        fields.every((f, i) => {
          const ef = ei.fields[i];
          return ef.fieldPath === f.fieldPath && (ef.order === f.order.toUpperCase() || ef.order === f.order);
        }),
    );

    if (alreadyExists) {
      console.log(`  ✅ 이미 존재: (${fields.map((f) => f.fieldPath).join(", ")})`);
      continue;
    }

    const body = {
      queryScope: idx.queryScope || "COLLECTION",
      fields: fields.map((f) => ({
        fieldPath: f.fieldPath,
        order: f.order.toUpperCase(),
      })),
    };

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/collectionGroups/${collectionGroup}/indexes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (res.ok) {
      const data = await res.json();
      console.log(`  🔨 생성 중: (${fields.map((f) => f.fieldPath).join(", ")}) → ${data.metadata?.state || "CREATING"}`);
    } else {
      const err = await res.json();
      if (err.error?.message?.includes("already exists")) {
        console.log(`  ✅ 이미 존재: (${fields.map((f) => f.fieldPath).join(", ")})`);
      } else {
        console.error(`  ❌ 실패: (${fields.map((f) => f.fieldPath).join(", ")})`, err.error?.message || err);
      }
    }
  }
}

// --- Deploy Rules ---
async function deployRules() {
  const rulesFile = resolve(__dirname, "../firestore.rules");
  const rulesSource = readFileSync(rulesFile, "utf8");
  const token = await getAccessToken();

  console.log(`\n📋 Deploying Firestore rules...`);

  // Step 1: Create a release source (ruleset)
  const createRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: {
          files: [{ name: "firestore.rules", content: rulesSource }],
        },
      }),
    },
  );

  if (!createRes.ok) {
    const err = await createRes.json();
    console.error("  ❌ 규칙셋 생성 실패:", err.error?.message || err);
    return;
  }

  const ruleset = await createRes.json();
  const rulesetName = ruleset.name as string;
  console.log(`  규칙셋 생성: ${rulesetName}`);

  // Step 2: Create/update the release to point to the new ruleset
  const releaseName = `projects/${PROJECT_ID}/releases/cloud.firestore`;

  // Try update (PATCH)
  const updateRes = await fetch(
    `https://firebaserules.googleapis.com/v1/${releaseName}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: releaseName, rulesetName }),
    },
  );

  if (updateRes.ok) {
    console.log("  ✅ 규칙 배포 완료");
  } else {
    // Try create (POST)
    const createReleaseRes = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: releaseName, rulesetName }),
      },
    );

    if (createReleaseRes.ok) {
      console.log("  ✅ 규칙 배포 완료 (신규)");
    } else {
      const err = await createReleaseRes.json();
      console.error("  ❌ 규칙 배포 실패:", err.error?.message || err);
    }
  }
}

// --- Main ---
async function main() {
  console.log("🚀 Firestore 인덱스 + 규칙 배포 시작");
  console.log(`  프로젝트: ${PROJECT_ID}`);

  await deployIndexes();
  await deployRules();

  console.log("\n✨ 완료!");
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
