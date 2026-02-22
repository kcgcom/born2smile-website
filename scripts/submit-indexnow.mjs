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

// 카테고리 → URL 슬러그 매핑 (lib/blog/category-slugs.ts와 동기화)
const CATEGORY_SLUG_MAP = {
  "임플란트": "implant",
  "치아교정": "orthodontics",
  "보철치료": "prosthetics",
  "보존치료": "restorative",
  "소아치료": "pediatric",
  "예방관리": "prevention",
  "건강상식": "health-tips",
};

function getTodayKST() {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
    .slice(0, 10); // YYYY-MM-DD
}

function getCategorySlug(category) {
  return CATEGORY_SLUG_MAP[category] ?? "health-tips";
}

function parseCategoryFromContent(content) {
  const match = content.match(/category:\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

async function findPostsByDate(targetDate) {
  const files = await readdir(POSTS_DIR);
  const tsFiles = files.filter((f) => f.endsWith(".ts"));
  const posts = [];

  for (const file of tsFiles) {
    const content = await readFile(join(POSTS_DIR, file), "utf-8");
    const dateMatch = content.match(/date:\s*["'](\d{4}-\d{2}-\d{2})["']/);
    if (dateMatch && dateMatch[1] === targetDate) {
      const slug = basename(file, ".ts");
      const category = parseCategoryFromContent(content);
      posts.push({ slug, category });
    }
  }

  return posts;
}

async function getAllPublishedPosts() {
  const today = getTodayKST();
  const files = await readdir(POSTS_DIR);
  const tsFiles = files.filter((f) => f.endsWith(".ts"));
  const posts = [];

  for (const file of tsFiles) {
    const content = await readFile(join(POSTS_DIR, file), "utf-8");
    const dateMatch = content.match(/date:\s*["'](\d{4}-\d{2}-\d{2})["']/);
    if (dateMatch && dateMatch[1] <= today) {
      const slug = basename(file, ".ts");
      const category = parseCategoryFromContent(content);
      posts.push({ slug, category });
    }
  }

  return posts;
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

    const [blogPosts, treatmentIds] = await Promise.all([
      getAllPublishedPosts(),
      getTreatmentIds(),
    ]);

    const categoryHubUrls = [...new Set(Object.values(CATEGORY_SLUG_MAP))].map(
      (catSlug) => `${BASE_URL}/blog/${catSlug}`,
    );

    urls = [
      BASE_URL,
      `${BASE_URL}/about`,
      `${BASE_URL}/treatments`,
      ...treatmentIds.map((id) => `${BASE_URL}/treatments/${id}`),
      `${BASE_URL}/blog`,
      ...categoryHubUrls,
      ...blogPosts.map(({ slug, category }) =>
        `${BASE_URL}/blog/${getCategorySlug(category)}/${slug}`,
      ),
      `${BASE_URL}/contact`,
    ];
  } else {
    const today = getTodayKST();
    console.log(`[IndexNow] ${today} 발행 포스트 확인 중...`);

    const newPosts = await findPostsByDate(today);

    if (newPosts.length === 0) {
      console.log("[IndexNow] 오늘 발행된 포스트가 없습니다. 제출 생략.");
      return;
    }

    urls = [
      ...newPosts.map(({ slug, category }) =>
        `${BASE_URL}/blog/${getCategorySlug(category)}/${slug}`,
      ),
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
