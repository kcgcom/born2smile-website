// =============================================================
// 블로그 포스트 파일 → Firestore 마이그레이션 스크립트
// 실행: npx tsx scripts/migrate-blog-to-firestore.ts [--dry-run]
// =============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAdminApp } from "../lib/firebase-admin.js";
import type { BlogPost, BlogPostSection } from "../lib/blog/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.resolve(__dirname, "../lib/blog/posts");
const COLLECTION = "blog-posts";
const CHARS_PER_MINUTE = 500;
const isDryRun = process.argv.includes("--dry-run");

interface FirestorePost {
  slug: string;
  category: string;
  tags: string[];
  title: string;
  subtitle: string;
  excerpt: string;
  date: string;
  dateModified: string | null;
  readTime: string;
  reviewedDate: string | null;
  content: BlogPostSection[];
  published: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

function calcReadTime(content: BlogPostSection[]): string {
  const totalChars = content.reduce(
    (sum, section) =>
      sum + (section.heading?.length ?? 0) + (section.content?.length ?? 0),
    0,
  );
  const minutes = Math.max(1, Math.ceil(totalChars / CHARS_PER_MINUTE));
  return `${minutes}분`;
}

function toFirestorePost(post: BlogPost): FirestorePost {
  const now = Timestamp.now();
  return {
    slug: post.slug,
    category: post.category,
    tags: post.tags as string[],
    title: post.title,
    subtitle: post.subtitle,
    excerpt: post.excerpt,
    date: post.date,
    dateModified: post.dateModified ?? null,
    readTime: calcReadTime(post.content),
    reviewedDate: post.reviewedDate ?? null,
    content: post.content,
    published: true,
    createdAt: now,
    updatedAt: now,
    updatedBy: "migration-script",
  };
}

async function main() {
  if (isDryRun) {
    console.log("=== DRY RUN 모드 — Firestore에 실제로 쓰지 않습니다 ===\n");
  }

  // 1. 포스트 파일 목록 수집
  const files = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .sort();

  console.log(`포스트 파일 ${files.length}개 발견\n`);

  // 2. 각 파일 동적 import
  const posts: BlogPost[] = [];
  const loadErrors: string[] = [];

  for (const file of files) {
    try {
      const mod = await import(path.join(postsDir, file));
      if (!mod.post) {
        console.warn(`⚠ ${file}: export const post not found, skipping`);
        loadErrors.push(file);
        continue;
      }
      posts.push(mod.post as BlogPost);
    } catch (err) {
      console.error(`✗ ${file} 로드 실패:`, err);
      loadErrors.push(file);
    }
  }

  console.log(`로드 성공: ${posts.length}개 / 실패: ${loadErrors.length}개\n`);

  // 3. Dry-run: 변환 결과 출력 후 종료
  if (isDryRun) {
    for (const post of posts) {
      const doc = toFirestorePost(post);
      console.log(
        `[DRY RUN] ${COLLECTION}/${doc.slug} ← readTime: ${doc.readTime}, sections: ${doc.content.length}`,
      );
    }
    console.log(`\n총 ${posts.length}개 문서를 쓸 예정입니다 (실제 쓰기 생략).`);
    if (loadErrors.length > 0) {
      console.warn(`\n로드 실패 파일: ${loadErrors.join(", ")}`);
    }
    return;
  }

  // 4. Firestore 초기화
  const app = getAdminApp();
  const db = getFirestore(app);

  // 5. 배치 쓰기 (최대 500개/배치)
  const BATCH_SIZE = 500;
  let written = 0;
  const writeErrors: string[] = [];

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const chunk = posts.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const post of chunk) {
      const doc = toFirestorePost(post);
      const ref = db.collection(COLLECTION).doc(post.slug);
      batch.set(ref, doc);
    }

    try {
      await batch.commit();
      written += chunk.length;
      console.log(
        `배치 커밋 완료: ${i + 1}~${i + chunk.length} (누적 ${written}개)`,
      );
    } catch (err) {
      console.error(`배치 ${i}~${i + chunk.length} 쓰기 실패:`, err);
      for (const post of chunk) {
        writeErrors.push(post.slug);
      }
    }
  }

  // 6. 검증: Firestore 문서 수 확인
  console.log("\n--- 검증 ---");
  try {
    const snapshot = await db.collection(COLLECTION).count().get();
    const firestoreCount = snapshot.data().count;
    console.log(`파일 기반 포스트 수: ${posts.length}`);
    console.log(`Firestore 문서 수:   ${firestoreCount}`);
    if (firestoreCount === posts.length) {
      console.log("✓ 문서 수 일치");
    } else {
      console.warn(
        `⚠ 문서 수 불일치 (파일: ${posts.length}, Firestore: ${firestoreCount})`,
      );
    }
  } catch (err) {
    console.error("Firestore 문서 수 조회 실패:", err);
  }

  // 7. 최종 요약
  console.log("\n=== 마이그레이션 요약 ===");
  console.log(`발견된 파일:    ${files.length}개`);
  console.log(`로드 성공:      ${posts.length}개`);
  console.log(`Firestore 쓰기: ${written}개`);
  if (loadErrors.length > 0) {
    console.warn(`로드 실패:      ${loadErrors.length}개 — ${loadErrors.join(", ")}`);
  }
  if (writeErrors.length > 0) {
    console.error(`쓰기 실패:      ${writeErrors.length}개 — ${writeErrors.join(", ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("마이그레이션 실패:", err);
  process.exit(1);
});
