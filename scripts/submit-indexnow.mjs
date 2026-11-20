#!/usr/bin/env node
// IndexNow URL 제출 스크립트
// 새로 발행된 블로그 포스트 URL을 IndexNow API에 제출합니다.
//
// 사용법:
//   node scripts/submit-indexnow.mjs          # 오늘 발행된 포스트만 제출
//   node scripts/submit-indexnow.mjs --all    # 전체 사이트 URL 제출

import { readFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseArgs } from "node:util";

const BASE_URL = "https://www.born2smile.co.kr";
const INDEXNOW_KEY = "7d01a83dddd13f9abf9186b937921369";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

// 레거시 카테고리 → URL 슬러그 매핑 (하위 호환)
const CATEGORY_SLUG_MAP = {
  "임플란트": "implant",
  "치아교정": "orthodontics",
  "보철치료": "prosthetics",
  "보존치료": "restorative",
  "소아치료": "pediatric",
  "예방관리": "prevention",
  "건강상식": "health-tips",
};

const CATEGORY_SLUGS = new Set(Object.values(CATEGORY_SLUG_MAP));

function getTodayKST() {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
    .slice(0, 10); // YYYY-MM-DD
}

function getCategorySlug(category) {
  if (CATEGORY_SLUGS.has(category)) return category;
  return CATEGORY_SLUG_MAP[category] ?? "health-tips";
}

function loadLocalEnv() {
  loadEnvFile(join(process.cwd(), ".env"));
  loadEnvFile(join(process.cwd(), ".env.local"));
}

async function fetchPublishedPosts(from, to) {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수 미설정 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  }

  const endpoint = new URL("/rest/v1/blog_posts", url);
  endpoint.searchParams.set("select", "slug,category,date,published");
  endpoint.searchParams.set("published", "eq.true");
  endpoint.searchParams.set("order", "date.desc,slug.asc");
  if (from) endpoint.searchParams.append("date", `gte.${from}`);
  endpoint.searchParams.append("date", `lte.${to}`);
  const posts = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    endpoint.searchParams.set("offset", String(offset));
    endpoint.searchParams.set("limit", String(pageSize));
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      throw new Error(`Supabase blog_posts 조회 실패: HTTP ${response.status}`);
    }
    const page = await response.json();
    posts.push(...page);
    if (page.length < pageSize) return posts;
  }
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
  const { values } = parseArgs({ options: {
    all: { type: "boolean" },
    from: { type: "string" },
    to: { type: "string" },
    "dry-run": { type: "boolean" },
    help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("node scripts/submit-indexnow.mjs [--all | --from YYYY-MM-DD --to YYYY-MM-DD] [--dry-run]");
    return;
  }
  const { all: isAll, from, to, "dry-run": dryRun } = values;
  const today = getTodayKST();
  const isRange = from !== undefined || to !== undefined;
  const isDate = (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().startsWith(date);
  if (isRange && (isAll || !isDate(from) || !isDate(to) || from > to || to > today)) {
    throw new Error("날짜 범위는 --all 없이 --from과 --to를 함께 지정하세요. 범위는 한국시간 기준 오늘 이하여야 합니다.");
  }
  const publishedPosts = await fetchPublishedPosts(isAll ? undefined : from ?? today, to ?? today);
  const postUrls = publishedPosts.map(({ slug, category }) =>
    `${BASE_URL}/blog/${getCategorySlug(category)}/${slug}`,
  );

  let urls;

  if (isAll) {
    console.log("[IndexNow] --all 모드: 전체 사이트 URL 제출");

    const [treatmentIds] = await Promise.all([
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
      ...postUrls,
      `${BASE_URL}/contact`,
    ];
  } else {
    if (postUrls.length === 0) {
      console.log("[IndexNow] 선택한 기간에 발행된 포스트가 없습니다.");
      return;
    }

    urls = [
      ...postUrls,
      ...(isRange ? [] : [`${BASE_URL}/blog`, `${BASE_URL}/sitemap.xml`]),
    ];
  }

  urls = [...new Set(urls)];
  console.log(`[IndexNow] ${urls.length}개 URL ${dryRun ? "제출 예정" : "제출"}`);
  urls.forEach((url) => console.log(`  - ${url}`));
  if (dryRun) return;

  const response = await submitToIndexNow(urls);

  if (response.status === 200) {
    console.log("[IndexNow] 접수 완료 (HTTP 200)");
  } else if (response.status === 202) {
    console.log("[IndexNow] 키 검증 대기 (HTTP 202)");
  } else {
    console.error(`[IndexNow] 실패 (HTTP ${response.status})`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[IndexNow] 오류:", err);
  process.exit(1);
});
