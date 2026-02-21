// =============================================================
// Firestore 마이그레이션 검증 스크립트
// 파일 기반 포스트와 Firestore 문서를 비교하여 무결성 확인
// 실행: npx tsx scripts/verify-migration.ts
// 종료 코드: 0 = 모두 일치, 1 = 불일치 있음
// =============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "../lib/firebase-admin.js";
import type { BlogPost, BlogPostSection } from "../lib/blog/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.resolve(__dirname, "../lib/blog/posts");
const COLLECTION = "blog-posts";

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
}

interface Mismatch {
  slug: string;
  field: string;
  file: unknown;
  firestore: unknown;
}

function compareSections(
  fileSections: BlogPostSection[],
  fsSections: BlogPostSection[],
): string | null {
  if (fileSections.length !== fsSections.length) {
    return `섹션 수 불일치 (파일: ${fileSections.length}, Firestore: ${fsSections.length})`;
  }
  for (let i = 0; i < fileSections.length; i++) {
    const file = fileSections[i];
    const fs = fsSections[i];
    if (file.heading !== fs.heading) {
      return `섹션[${i}].heading 불일치`;
    }
    if (file.content !== fs.content) {
      return `섹션[${i}].content 불일치`;
    }
  }
  return null;
}

function comparePost(
  filePost: BlogPost,
  fsPost: FirestorePost,
): Mismatch[] {
  const mismatches: Mismatch[] = [];
  const slug = filePost.slug;

  const scalarFields: Array<keyof Pick<BlogPost, "title" | "subtitle" | "excerpt" | "category" | "date">> =
    ["title", "subtitle", "excerpt", "category", "date"];

  for (const field of scalarFields) {
    if (filePost[field] !== fsPost[field]) {
      mismatches.push({ slug, field, file: filePost[field], firestore: fsPost[field] });
    }
  }

  // tags: order-insensitive comparison
  const fileTags = [...(filePost.tags as string[])].sort();
  const fsTags = [...(fsPost.tags ?? [])].sort();
  if (JSON.stringify(fileTags) !== JSON.stringify(fsTags)) {
    mismatches.push({ slug, field: "tags", file: fileTags, firestore: fsTags });
  }

  // dateModified: undefined in file maps to null in Firestore
  const fileModified = filePost.dateModified ?? null;
  if (fileModified !== fsPost.dateModified) {
    mismatches.push({
      slug,
      field: "dateModified",
      file: fileModified,
      firestore: fsPost.dateModified,
    });
  }

  // reviewedDate: same null-coalescing rule
  const fileReviewed = filePost.reviewedDate ?? null;
  if (fileReviewed !== fsPost.reviewedDate) {
    mismatches.push({
      slug,
      field: "reviewedDate",
      file: fileReviewed,
      firestore: fsPost.reviewedDate,
    });
  }

  // content sections
  const sectionError = compareSections(filePost.content, fsPost.content ?? []);
  if (sectionError) {
    mismatches.push({ slug, field: "content", file: sectionError, firestore: null });
  }

  return mismatches;
}

async function main() {
  // 1. 파일 기반 포스트 로드
  const files = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .sort();

  console.log(`파일에서 포스트 ${files.length}개 로드 중...`);

  const filePosts = new Map<string, BlogPost>();
  const loadErrors: string[] = [];

  for (const file of files) {
    try {
      const mod = await import(path.join(postsDir, file));
      if (!mod.post) {
        console.warn(`⚠ ${file}: export const post not found, skipping`);
        loadErrors.push(file);
        continue;
      }
      const post = mod.post as BlogPost;
      filePosts.set(post.slug, post);
    } catch (err) {
      console.error(`✗ ${file} 로드 실패:`, err);
      loadErrors.push(file);
    }
  }

  if (loadErrors.length > 0) {
    console.warn(`\n⚠ 로드 실패 파일 ${loadErrors.length}개: ${loadErrors.join(", ")}\n`);
  }

  // 2. Firestore 포스트 로드
  console.log(`Firestore ${COLLECTION} 컬렉션에서 문서 로드 중...`);

  const app = getAdminApp();
  const db = getFirestore(app);
  const snapshot = await db.collection(COLLECTION).get();

  const fsPosts = new Map<string, FirestorePost>();
  for (const doc of snapshot.docs) {
    fsPosts.set(doc.id, doc.data() as FirestorePost);
  }

  console.log(
    `\n파일 포스트: ${filePosts.size}개 | Firestore 문서: ${fsPosts.size}개\n`,
  );

  // 3. 비교
  let totalMismatches = 0;

  // 3a. 파일에 있지만 Firestore에 없는 포스트
  const missingInFirestore: string[] = [];
  for (const slug of filePosts.keys()) {
    if (!fsPosts.has(slug)) {
      missingInFirestore.push(slug);
    }
  }

  // 3b. Firestore에 있지만 파일에 없는 포스트
  const extraInFirestore: string[] = [];
  for (const slug of fsPosts.keys()) {
    if (!filePosts.has(slug)) {
      extraInFirestore.push(slug);
    }
  }

  // 3c. 공통 포스트 필드 비교
  const allFieldMismatches: Mismatch[] = [];
  for (const [slug, filePost] of filePosts) {
    const fsPost = fsPosts.get(slug);
    if (!fsPost) continue; // already reported in missingInFirestore
    const mismatches = comparePost(filePost, fsPost);
    allFieldMismatches.push(...mismatches);
  }

  // 4. 결과 출력
  if (missingInFirestore.length > 0) {
    console.log(`\n[파일에 있으나 Firestore 없음] ${missingInFirestore.length}개:`);
    for (const slug of missingInFirestore) {
      console.log(`  ✗ ${slug}`);
    }
    totalMismatches += missingInFirestore.length;
  }

  if (extraInFirestore.length > 0) {
    console.log(`\n[Firestore에만 있음 (파일 없음)] ${extraInFirestore.length}개:`);
    for (const slug of extraInFirestore) {
      console.log(`  ⚠ ${slug}`);
    }
    totalMismatches += extraInFirestore.length;
  }

  if (allFieldMismatches.length > 0) {
    console.log(`\n[필드 불일치] ${allFieldMismatches.length}건:`);
    for (const m of allFieldMismatches) {
      console.log(`  ✗ ${m.slug} / ${m.field}`);
      console.log(`      파일:      ${JSON.stringify(m.file)}`);
      console.log(`      Firestore: ${JSON.stringify(m.firestore)}`);
    }
    totalMismatches += allFieldMismatches.length;
  }

  // 5. 요약
  const verifiedCount = filePosts.size - missingInFirestore.length - allFieldMismatches.length;
  console.log("\n=== 검증 요약 ===");

  if (totalMismatches === 0) {
    console.log(`✓ ${filePosts.size}개 포스트 모두 일치`);
    process.exit(0);
  } else {
    if (verifiedCount > 0) {
      console.log(`✓ ${verifiedCount}개 포스트 일치`);
    }
    console.error(`✗ ${totalMismatches}건 불일치 발견`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("검증 스크립트 실패:", err);
  process.exit(1);
});
