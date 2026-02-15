#!/usr/bin/env node
// IndexNow URL 제출 스크립트
// 새로 발행된 블로그 포스트 URL을 IndexNow API에 제출합니다.
// Node.js 내장 모듈만 사용하여 의존성 설치 없이 실행 가능합니다.
//
// 사용법:
//   node scripts/submit-indexnow.mjs          # 오늘 발행된 포스트만 제출
//   node scripts/submit-indexnow.mjs --all    # 전체 사이트 URL 제출

import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";

const BASE_URL = "https://www.born2smile.co.kr";
const INDEXNOW_KEY = "7d01a83dddd13f9abf9186b937921369";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const POSTS_DIR = join(process.cwd(), "lib/blog/posts");

function getTodayKST() {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
    .slice(0, 10); // YYYY-MM-DD
}

async function findPostsByDate(targetDate) {
  const files = await readdir(POSTS_DIR);
  const tsFiles = files.filter((f) => f.endsWith(".ts"));
  const slugs = [];

  for (const file of tsFiles) {
    const content = await readFile(join(POSTS_DIR, file), "utf-8");
    const dateMatch = content.match(/date:\s*["'](\d{4}-\d{2}-\d{2})["']/);
    if (dateMatch && dateMatch[1] === targetDate) {
      slugs.push(basename(file, ".ts"));
    }
  }

  return slugs;
}

async function getAllPublishedSlugs() {
  const today = getTodayKST();
  const files = await readdir(POSTS_DIR);
  const tsFiles = files.filter((f) => f.endsWith(".ts"));
  const slugs = [];

  for (const file of tsFiles) {
    const content = await readFile(join(POSTS_DIR, file), "utf-8");
    const dateMatch = content.match(/date:\s*["'](\d{4}-\d{2}-\d{2})["']/);
    if (dateMatch && dateMatch[1] <= today) {
      slugs.push(basename(file, ".ts"));
    }
  }

  return slugs;
}

// lib/constants.ts에서 진료 과목 ID 추출
async function getTreatmentIds() {
  const constantsPath = join(process.cwd(), "lib/constants.ts");
  const content = await readFile(constantsPath, "utf-8");
  const ids = [];
  const regex = /id:\s*["']([a-z-]+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

async function submitToIndexNow(urls) {
  const body = {
    host: "www.born2smile.co.kr",
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  return response;
}

async function main() {
  const isAll = process.argv.includes("--all");

  let urls;

  if (isAll) {
    console.log("[IndexNow] --all 모드: 전체 사이트 URL 제출");

    const [blogSlugs, treatmentIds] = await Promise.all([
      getAllPublishedSlugs(),
      getTreatmentIds(),
    ]);

    urls = [
      BASE_URL,
      `${BASE_URL}/about`,
      `${BASE_URL}/treatments`,
      ...treatmentIds.map((id) => `${BASE_URL}/treatments/${id}`),
      `${BASE_URL}/blog`,
      ...blogSlugs.map((slug) => `${BASE_URL}/blog/${slug}`),
      `${BASE_URL}/contact`,
    ];
  } else {
    const today = getTodayKST();
    console.log(`[IndexNow] ${today} 발행 포스트 확인 중...`);

    const newSlugs = await findPostsByDate(today);

    if (newSlugs.length === 0) {
      console.log("[IndexNow] 오늘 발행된 포스트가 없습니다. 제출 생략.");
      return;
    }

    urls = [
      ...newSlugs.map((slug) => `${BASE_URL}/blog/${slug}`),
      // 블로그 목록과 사이트맵도 변경되므로 함께 제출
      `${BASE_URL}/blog`,
      `${BASE_URL}/sitemap.xml`,
    ];
  }

  console.log(`[IndexNow] ${urls.length}개 URL 제출:`);
  urls.forEach((url) => console.log(`  - ${url}`));

  const response = await submitToIndexNow(urls);

  // IndexNow API 응답: 200 OK, 202 Accepted 모두 성공
  if (response.ok || response.status === 202) {
    console.log(`[IndexNow] 성공! (HTTP ${response.status})`);
  } else {
    const text = await response.text();
    console.error(
      `[IndexNow] 실패! (HTTP ${response.status}) 응답: ${text}`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[IndexNow] 오류:", err);
  process.exit(1);
});
