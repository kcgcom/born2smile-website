// =============================================================
// 기존 .ts 블로그 포스트를 Notion 데이터베이스로 마이그레이션
//
// 사전 준비:
// 1. https://www.notion.so/my-integrations 에서 Integration 생성
// 2. 생성된 API Key를 .env.local에 NOTION_API_KEY로 설정
// 3. Notion에서 빈 페이지 생성 → Integration과 공유 (Connect to 선택)
// 4. 빈 페이지 ID를 NOTION_PARENT_PAGE_ID로 설정 (URL의 마지막 32자리)
//
// 실행:
//   NOTION_API_KEY=ntn_xxx NOTION_PARENT_PAGE_ID=xxx pnpm tsx scripts/migrate-to-notion.ts
//
// 결과:
// - 새로운 Notion Database가 생성됨
// - 51개 포스트가 각각 Notion 페이지로 생성됨
// - 생성된 Database ID 출력 → .env.local의 NOTION_BLOG_DATABASE_ID에 설정
// =============================================================

import { Client } from "@notionhq/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.resolve(__dirname, "../lib/blog/posts");

const NOTION_API_KEY: string = process.env.NOTION_API_KEY ?? "";
const PARENT_PAGE_ID: string = process.env.NOTION_PARENT_PAGE_ID ?? "";

if (!NOTION_API_KEY || !PARENT_PAGE_ID) {
  console.error(
    "환경변수를 설정하세요:\n" +
      "  NOTION_API_KEY=ntn_xxx NOTION_PARENT_PAGE_ID=xxx pnpm tsx scripts/migrate-to-notion.ts"
  );
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

// Notion API rate limit 대응 (3 req/s)
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // 1. 포스트 파일 읽기
  const files = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .sort();

  console.log(`${files.length}개 포스트 파일 발견\n`);

  // 포스트 데이터 로드
  const posts = [];
  for (const file of files) {
    const mod = await import(path.join(postsDir, file));
    if (!mod.post) {
      console.warn(`⚠ ${file}: export const post not found, skipping`);
      continue;
    }
    posts.push(mod.post);
  }

  console.log(`${posts.length}개 포스트 로드 완료\n`);

  // 2. Notion Database 생성 (SDK v5)
  console.log("Notion Database 생성 중...");
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    title: [{ type: "text", text: { content: "블로그 포스트" } }],
    initial_data_source: {
      properties: {
        Title: { type: "title", title: {} },
        Subtitle: { type: "rich_text", rich_text: {} },
        Slug: { type: "rich_text", rich_text: {} },
        Category: {
          type: "select",
          select: {
            options: [
              { name: "예방·구강관리", color: "blue" },
              { name: "보존치료", color: "green" },
              { name: "보철치료", color: "purple" },
              { name: "임플란트", color: "red" },
              { name: "치아교정", color: "yellow" },
              { name: "소아치료", color: "orange" },
              { name: "구강건강상식", color: "default" },
            ],
          },
        },
        Tags: {
          type: "multi_select",
          multi_select: {
            options: [
              { name: "치료후관리", color: "blue" },
              { name: "생활습관", color: "green" },
              { name: "팩트체크", color: "purple" },
              { name: "증상가이드", color: "red" },
              { name: "비교가이드", color: "yellow" },
              { name: "임산부", color: "pink" },
              { name: "시니어", color: "orange" },
            ],
          },
        },
        Excerpt: { type: "rich_text", rich_text: {} },
        Date: { type: "date", date: {} },
        ReadTime: { type: "rich_text", rich_text: {} },
        Published: { type: "checkbox", checkbox: {} },
      },
    },
  });

  const dbId = db.id;
  console.log(`Database 생성 완료: ${dbId}\n`);
  console.log(`→ .env.local에 추가: NOTION_BLOG_DATABASE_ID=${dbId}\n`);

  // 3. 각 포스트를 Notion 페이지로 생성
  let created = 0;
  for (const post of posts) {
    console.log(`[${created + 1}/${posts.length}] ${post.slug}...`);

    // 본문 블록 생성 (heading_2 + paragraph 쌍)
    const children: Parameters<
      typeof notion.blocks.children.append
    >[0]["children"] = [];

    for (const section of post.content) {
      children.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            { type: "text", text: { content: section.heading } },
          ],
        },
      });

      // Notion API는 한 블록의 rich_text에 최대 2000자 제한
      const text = section.content;
      if (text.length <= 2000) {
        children.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: text } }],
          },
        });
      } else {
        for (let i = 0; i < text.length; i += 2000) {
          children.push({
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: { content: text.slice(i, i + 2000) },
                },
              ],
            },
          });
        }
      }
    }

    // Notion API blocks는 한 번에 최대 100개
    const pageChildren = children.slice(0, 100);

    await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        Title: {
          title: [{ text: { content: post.title } }],
        },
        Subtitle: {
          rich_text: [{ text: { content: post.subtitle } }],
        },
        Slug: {
          rich_text: [{ text: { content: post.slug } }],
        },
        Category: {
          select: { name: post.category },
        },
        Tags: {
          multi_select: post.tags.map((t: string) => ({ name: t })),
        },
        Excerpt: {
          rich_text: [
            {
              text: {
                content:
                  post.excerpt.length > 2000
                    ? post.excerpt.slice(0, 2000)
                    : post.excerpt,
              },
            },
          ],
        },
        Date: {
          date: { start: post.date },
        },
        ReadTime: {
          rich_text: [{ text: { content: post.readTime } }],
        },
        Published: {
          checkbox: true,
        },
      },
      children: pageChildren,
    });

    created++;

    // Rate limit 대응: 350ms 간격
    await sleep(350);
  }

  console.log(`\n${created}개 포스트 마이그레이션 완료!`);
  console.log(`\n=== 다음 단계 ===`);
  console.log(`1. .env.local에 추가:`);
  console.log(`   NOTION_BLOG_DATABASE_ID=${dbId}`);
  console.log(`2. pnpm dev 로 확인`);
  console.log(
    `3. Notion에서 포스트 편집 시 1시간 이내 자동 반영 (ISR revalidate: 3600)`
  );
}

main().catch((err) => {
  console.error("마이그레이션 실패:", err);
  process.exit(1);
});
