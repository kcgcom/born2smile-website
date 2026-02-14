// =============================================================
// Notion → .ts 파일 동기화
//
// Notion 데이터베이스에서 블로그 포스트를 읽어와
// lib/blog/posts/*.ts 파일로 저장합니다.
//
// 실행:
//   pnpm sync-from-notion
//
// 사전 준비:
//   .env.local에 NOTION_API_KEY, NOTION_BLOG_DATABASE_ID 설정
//   (pnpm migrate-to-notion 실행 후 자동 안내됨)
//
// 워크플로우:
//   1. Notion에서 포스트 편집 (제목, 본문, 카테고리 등)
//   2. pnpm sync-from-notion 실행
//   3. 변경된 .ts 파일 확인 후 git commit & deploy
// =============================================================

import { Client } from "@notionhq/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.resolve(__dirname, "../lib/blog/posts");

const NOTION_API_KEY: string = process.env.NOTION_API_KEY ?? "";
const DB_ID: string = process.env.NOTION_BLOG_DATABASE_ID ?? "";

if (!NOTION_API_KEY || !DB_ID) {
  console.error(
    "환경변수를 설정하세요:\n" +
      "  NOTION_API_KEY=ntn_xxx NOTION_BLOG_DATABASE_ID=xxx pnpm sync-from-notion\n\n" +
      "아직 Notion DB가 없으면 먼저 pnpm migrate-to-notion 을 실행하세요."
  );
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

const VALID_CATEGORIES = [
  "예방·구강관리",
  "보존치료",
  "보철치료",
  "임플란트",
  "치아교정",
  "소아치료",
  "구강건강상식",
] as const;

const VALID_TAGS = [
  "치료후관리",
  "생활습관",
  "팩트체크",
  "증상가이드",
  "비교가이드",
  "임산부",
  "시니어",
] as const;

// =============================================================
// Notion 헬퍼
// =============================================================

function isFullPage(page: unknown): page is PageObjectResponse {
  return (
    (page as PageObjectResponse).object === "page" &&
    "properties" in (page as PageObjectResponse)
  );
}

function isFullBlock(block: unknown): block is BlockObjectResponse {
  return (
    (block as BlockObjectResponse).object === "block" &&
    "type" in (block as BlockObjectResponse)
  );
}

function richTextToPlain(items: RichTextItemResponse[]): string {
  return items.map((item) => item.plain_text).join("");
}

// =============================================================
// 메타데이터 추출
// =============================================================

function extractMeta(page: PageObjectResponse) {
  const props = page.properties;

  const getTitle = (): string => {
    if (props.Title?.type === "title") return richTextToPlain(props.Title.title);
    return "";
  };

  const getRichText = (name: string): string => {
    const prop = props[name];
    if (prop?.type === "rich_text") return richTextToPlain(prop.rich_text);
    return "";
  };

  const getSelect = (name: string): string => {
    const prop = props[name];
    if (prop?.type === "select" && prop.select) return prop.select.name;
    return "";
  };

  const getMultiSelect = (name: string): string[] => {
    const prop = props[name];
    if (prop?.type === "multi_select") return prop.multi_select.map((s) => s.name);
    return [];
  };

  const getDate = (name: string): string => {
    const prop = props[name];
    if (prop?.type === "date" && prop.date) return prop.date.start;
    return new Date().toISOString().slice(0, 10);
  };

  const rawCategory = getSelect("Category");
  const category = VALID_CATEGORIES.includes(rawCategory as typeof VALID_CATEGORIES[number])
    ? rawCategory
    : "구강건강상식";

  const rawTags = getMultiSelect("Tags");
  const tags = rawTags.filter((t) =>
    (VALID_TAGS as readonly string[]).includes(t)
  );

  return {
    slug: getRichText("Slug"),
    category,
    tags,
    title: getTitle(),
    subtitle: getRichText("Subtitle"),
    excerpt: getRichText("Excerpt"),
    date: getDate("Date"),
    readTime: getRichText("ReadTime") || "3분",
  };
}

// =============================================================
// 블록 가져오기
// =============================================================

async function getAllBlocks(blockId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });
    for (const result of response.results) {
      if (isFullBlock(result)) blocks.push(result);
    }
    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return blocks;
}

// =============================================================
// Notion 블록 → BlogPostSection[] 변환
// heading_2를 섹션 구분자로 사용, 나머지 블록은 텍스트로 합침
// =============================================================

function blocksToSections(
  blocks: BlockObjectResponse[]
): { heading: string; content: string }[] {
  const sections: { heading: string; content: string }[] = [];
  let currentHeading = "";
  let currentParts: string[] = [];

  const flush = () => {
    if (currentHeading && currentParts.length > 0) {
      sections.push({
        heading: currentHeading,
        content: currentParts.join("\n\n"),
      });
    }
    currentParts = [];
  };

  for (const block of blocks) {
    switch (block.type) {
      case "heading_2": {
        flush();
        currentHeading = richTextToPlain(block.heading_2.rich_text);
        break;
      }
      case "heading_1": {
        flush();
        currentHeading = richTextToPlain(block.heading_1.rich_text);
        break;
      }
      case "heading_3": {
        // h3는 본문 내 소제목으로 처리
        const h3 = richTextToPlain(block.heading_3.rich_text);
        if (h3) currentParts.push(`[${h3}]`);
        break;
      }
      case "paragraph": {
        const text = richTextToPlain(block.paragraph.rich_text);
        if (text) currentParts.push(text);
        break;
      }
      case "bulleted_list_item": {
        const text = richTextToPlain(block.bulleted_list_item.rich_text);
        if (text) currentParts.push(`• ${text}`);
        break;
      }
      case "numbered_list_item": {
        const text = richTextToPlain(block.numbered_list_item.rich_text);
        if (text) currentParts.push(text);
        break;
      }
      case "quote": {
        const text = richTextToPlain(block.quote.rich_text);
        if (text) currentParts.push(text);
        break;
      }
      case "callout": {
        const text = richTextToPlain(block.callout.rich_text);
        if (text) currentParts.push(text);
        break;
      }
      // divider, image 등은 무시 (텍스트 전용)
    }
  }

  flush();
  return sections;
}

// =============================================================
// .ts 파일 생성
// =============================================================

function generatePostFile(meta: ReturnType<typeof extractMeta>, sections: { heading: string; content: string }[], id: number): string {
  const post = {
    id,
    slug: meta.slug,
    tags: meta.tags,
    category: meta.category,
    title: meta.title,
    subtitle: meta.subtitle,
    excerpt: meta.excerpt,
    content: sections,
    date: meta.date,
    readTime: meta.readTime,
  };

  // JSON.stringify로 생성 후 가독성 보정
  const json = JSON.stringify(post, null, 2);

  return `import type { BlogPost } from "../types";\n\nexport const post: BlogPost = ${json};\n`;
}

// =============================================================
// 메인
// =============================================================

async function main() {
  console.log("Notion DB에서 포스트를 가져오는 중...\n");

  // 1. 발행된 포스트 목록 조회
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: DB_ID,
      filter: {
        property: "Published",
        checkbox: { equals: true },
      },
      sorts: [{ property: "Date", direction: "descending" }],
      start_cursor: cursor,
    });
    for (const result of response.results) {
      if (isFullPage(result)) pages.push(result);
    }
    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  console.log(`${pages.length}개 발행 포스트 발견\n`);

  // 2. 각 포스트의 블록을 가져와서 .ts 파일로 저장
  let synced = 0;
  let created = 0;
  let updated = 0;

  for (const page of pages) {
    const meta = extractMeta(page);
    if (!meta.slug) {
      console.warn(`⚠ Slug 없는 포스트 건너뜀: "${meta.title}"`);
      continue;
    }

    const blocks = await getAllBlocks(page.id);
    const sections = blocksToSections(blocks);

    if (sections.length === 0) {
      console.warn(`⚠ 본문 없는 포스트 건너뜀: ${meta.slug}`);
      continue;
    }

    const filePath = path.join(postsDir, `${meta.slug}.ts`);
    const fileContent = generatePostFile(meta, sections, synced + 1);
    const existed = fs.existsSync(filePath);

    // 기존 파일이 있으면 내용 비교 후 변경분만 덮어쓰기
    if (existed) {
      const existing = fs.readFileSync(filePath, "utf-8");
      if (existing === fileContent) {
        synced++;
        continue; // 변경 없음
      }
      updated++;
    } else {
      created++;
    }

    fs.writeFileSync(filePath, fileContent, "utf-8");
    console.log(`${existed ? "✏️  수정" : "✨ 생성"}: ${meta.slug}.ts`);
    synced++;

    // Rate limit 대응
    await new Promise((r) => setTimeout(r, 350));
  }

  console.log(
    `\n동기화 완료! (총 ${synced}개 — 신규 ${created}, 수정 ${updated}, 변경없음 ${synced - created - updated})`
  );

  if (created > 0 || updated > 0) {
    console.log("\n다음 단계:");
    console.log("  1. pnpm generate-blog-meta  (메타데이터 재생성)");
    console.log("  2. git diff                  (변경분 확인)");
    console.log("  3. git add & commit & push   (배포)");
  }
}

main().catch((err) => {
  console.error("동기화 실패:", err);
  process.exit(1);
});
