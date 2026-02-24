// =============================================================
// 카테고리명 변경 마이그레이션 (1회성)
// "예방·구강관리" → "예방관리", "구강건강상식" → "건강상식"
//
// 실행: GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa-key.json npx tsx scripts/migrate-category-rename.ts
// 테스트: GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa-key.json npx tsx scripts/migrate-category-rename.ts --dry-run
// =============================================================

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "../lib/firebase-admin.js";

const COLLECTION = "blog-posts";
const isDryRun = process.argv.includes("--dry-run");

const RENAMES: Record<string, string> = {
  "예방·구강관리": "예방관리",
  "구강건강상식": "건강상식",
};

async function main() {
  console.log(`\n카테고리명 변경 마이그레이션 ${isDryRun ? "(DRY RUN)" : ""}\n`);

  const db = getFirestore(getAdminApp());
  const snapshot = await db.collection(COLLECTION).get();

  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const oldCategory = data.category as string;
    const newCategory = RENAMES[oldCategory];

    if (!newCategory) {
      skipped++;
      continue;
    }

    console.log(`  ${doc.id}: "${oldCategory}" → "${newCategory}"`);

    if (!isDryRun) {
      await doc.ref.update({ category: newCategory });
    }
    updated++;
  }

  console.log(`\n완료: ${updated}개 변경, ${skipped}개 스킵 (총 ${snapshot.size}개)\n`);
}

main().catch((err) => {
  console.error("마이그레이션 실패:", err);
  process.exit(1);
});
