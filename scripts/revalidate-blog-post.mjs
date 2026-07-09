#!/usr/bin/env node
// 블로그 캐시 무효화 스크립트
//
// 사용법:
//   pnpm revalidate-blog root-canal-after-pain-guide
//   pnpm revalidate-blog --all
//   pnpm revalidate-blog root-canal-after-pain-guide --base-url=https://www.born2smile.co.kr

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_BASE_URL = "https://www.born2smile.co.kr";

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

function loadLocalEnv() {
  loadEnvFile(join(process.cwd(), ".env"));
  loadEnvFile(join(process.cwd(), ".env.local"));
}

function parseArgs(argv) {
  let slug = null;
  let all = false;
  let baseUrl = process.env.REVALIDATE_BASE_URL || DEFAULT_BASE_URL;

  for (const arg of argv) {
    if (arg === "--all") {
      all = true;
      continue;
    }

    if (arg.startsWith("--base-url=")) {
      baseUrl = arg.slice("--base-url=".length);
      continue;
    }

    if (!arg.startsWith("-") && !slug) {
      slug = arg;
    }
  }

  return { slug, all, baseUrl: baseUrl.replace(/\/+$/, "") };
}

function printUsage() {
  console.error("사용법:");
  console.error("  pnpm revalidate-blog <blog-slug>");
  console.error("  pnpm revalidate-blog --all");
  console.error("");
  console.error("예:");
  console.error("  pnpm revalidate-blog root-canal-after-pain-guide");
}

function explainFailure(status, body) {
  if (status === 401) {
    return [
      "인증 실패(401): ADMIN_CLI_SECRET이 프로덕션에서 거부되었습니다.",
      "",
      "확인할 것:",
      "  1. 로컬 .env.local의 ADMIN_CLI_SECRET 값이 맞는지 확인",
      "  2. Vercel Production Environment Variables에 ADMIN_CLI_SECRET이 같은 값으로 설정되어 있는지 확인",
      "  3. Vercel 환경변수를 수정했다면 재배포가 되었는지 확인",
      "",
      `서버 응답: ${body || "(응답 본문 없음)"}`,
    ].join("\n");
  }

  if (status === 403) {
    return [
      "권한 실패(403): revalidate API가 요청을 거부했습니다.",
      "",
      "ADMIN_CLI_SECRET이 프로덕션에 없거나, 서버가 CLI secret 인증 대신 관리자 이메일 인증 경로로 처리했을 수 있습니다.",
      "Vercel Production Environment Variables의 ADMIN_CLI_SECRET 설정과 재배포 여부를 확인하세요.",
      "",
      `서버 응답: ${body || "(응답 본문 없음)"}`,
    ].join("\n");
  }

  if (status === 404) {
    return [
      "대상 포스트를 찾지 못했습니다(404).",
      "slug가 Supabase blog_posts에 존재하는지 확인하세요.",
      "",
      `서버 응답: ${body || "(응답 본문 없음)"}`,
    ].join("\n");
  }

  return [
    `캐시 무효화 실패(HTTP ${status}).`,
    `서버 응답: ${body || "(응답 본문 없음)"}`,
  ].join("\n");
}

async function main() {
  loadLocalEnv();

  const { slug, all, baseUrl } = parseArgs(process.argv.slice(2));
  const secret = process.env.ADMIN_CLI_SECRET;

  if (!secret) {
    console.error("ADMIN_CLI_SECRET이 설정되어 있지 않습니다.");
    console.error("");
    console.error("해결 방법:");
    console.error("  1. .env.local에 ADMIN_CLI_SECRET을 추가하세요.");
    console.error("  2. 같은 값을 Vercel Production Environment Variables에도 설정하세요.");
    console.error("  3. Vercel 환경변수 변경 후 프로덕션을 재배포하세요.");
    process.exit(1);
  }

  if (!all && !slug) {
    printUsage();
    process.exit(1);
  }

  const endpoint = `${baseUrl}/api/admin/revalidate`;
  const body = all ? {} : { slug };

  console.log(`[Revalidate] ${all ? "전체 블로그 캐시" : `포스트: ${slug}`}`);
  console.log(`[Revalidate] endpoint: ${endpoint}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    console.error(explainFailure(response.status, responseText));
    process.exit(1);
  }

  const parsed = responseText ? JSON.parse(responseText) : null;
  console.log("[Revalidate] 성공");
  if (parsed) console.log(JSON.stringify(parsed, null, 2));
}

main().catch((error) => {
  console.error("[Revalidate] 오류:", error);
  process.exit(1);
});
