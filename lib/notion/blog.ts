// =============================================================
// Notion 블로그 데이터 조회
// =============================================================
//
// Notion Database 속성 스키마 (생성 시 이 구조로 설정):
//   Title       (title)        — 포스트 제목
//   Subtitle    (rich_text)    — 부제목
//   Slug        (rich_text)    — URL slug (영문 소문자+하이픈)
//   Category    (select)       — 카테고리 (예방·구강관리, 보존치료 등)
//   Tags        (multi_select) — 태그 (치료후관리, 생활습관 등)
//   Excerpt     (rich_text)    — 요약 (목록 노출용)
//   Date        (date)         — 게시일
//   ReadTime    (rich_text)    — 읽기 시간 (예: "3분")
//   Published   (checkbox)     — 발행 여부
//
// 본문은 Notion 페이지 블록(blocks)으로 작성합니다.
// =============================================================

import { getNotionClient, NOTION_BLOG_DB_ID } from "./client";
import type { BlogPostMeta, BlogCategoryValue, BlogTag } from "../blog/types";
import { BLOG_CATEGORIES, BLOG_TAGS } from "../blog/types";
import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

// =============================================================
// 타입 가드
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

// =============================================================
// Notion rich text → 문자열 변환
// =============================================================

function richTextToPlain(items: RichTextItemResponse[]): string {
  return items.map((item) => item.plain_text).join("");
}

// =============================================================
// Notion 페이지 → BlogPostMeta 변환
// =============================================================

let nextId = 1;

function pageToMeta(page: PageObjectResponse): BlogPostMeta {
  const props = page.properties;

  const getTitle = (): string => {
    if (props.Title?.type === "title") {
      return richTextToPlain(props.Title.title);
    }
    return "";
  };

  const getRichText = (name: string): string => {
    const prop = props[name];
    if (prop?.type === "rich_text") {
      return richTextToPlain(prop.rich_text);
    }
    return "";
  };

  const getSelect = (name: string): string => {
    const prop = props[name];
    if (prop?.type === "select" && prop.select) {
      return prop.select.name;
    }
    return "";
  };

  const getMultiSelect = (name: string): string[] => {
    const prop = props[name];
    if (prop?.type === "multi_select") {
      return prop.multi_select.map((s) => s.name);
    }
    return [];
  };

  const getDate = (name: string): string => {
    const prop = props[name];
    if (prop?.type === "date" && prop.date) {
      return prop.date.start;
    }
    return new Date().toISOString().slice(0, 10);
  };

  // 카테고리 유효성 검증
  const rawCategory = getSelect("Category");
  const validCategories = BLOG_CATEGORIES.filter((c) => c !== "전체");
  const category: BlogCategoryValue = validCategories.includes(
    rawCategory as BlogCategoryValue
  )
    ? (rawCategory as BlogCategoryValue)
    : "구강건강상식";

  // 태그 유효성 검증
  const rawTags = getMultiSelect("Tags");
  const tags = rawTags.filter((t): t is BlogTag =>
    (BLOG_TAGS as readonly string[]).includes(t)
  );

  return {
    id: nextId++,
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
// 공개 API
// =============================================================

/** 발행된 모든 포스트의 메타데이터를 조회 */
export async function getAllPostsMetaFromNotion(): Promise<BlogPostMeta[]> {
  const notion = getNotionClient();
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    // Notion SDK v5: dataSources.query (구 databases.query)
    const response = await notion.dataSources.query({
      data_source_id: NOTION_BLOG_DB_ID,
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

  nextId = 1;
  return pages.map(pageToMeta);
}

/** slug로 포스트 메타데이터와 본문 블록을 함께 조회 */
export async function getPostFromNotion(
  slug: string
): Promise<{ meta: BlogPostMeta; blocks: BlockObjectResponse[] } | null> {
  const notion = getNotionClient();

  const response = await notion.dataSources.query({
    data_source_id: NOTION_BLOG_DB_ID,
    filter: {
      and: [
        { property: "Slug", rich_text: { equals: slug } },
        { property: "Published", checkbox: { equals: true } },
      ],
    },
    page_size: 1,
  });

  const page = response.results[0];
  if (!page || !isFullPage(page)) return null;

  const blocks = await getAllBlocks(page.id);
  nextId = 1;

  return { meta: pageToMeta(page), blocks };
}

/** 발행된 모든 포스트의 slug 목록을 조회 (generateStaticParams 용) */
export async function getPostSlugsFromNotion(): Promise<string[]> {
  const metas = await getAllPostsMetaFromNotion();
  return metas.map((m) => m.slug);
}

// =============================================================
// 블록 조회 (페이지네이션 + 자식 블록 재귀)
// =============================================================

async function getAllBlocks(
  blockId: string
): Promise<BlockObjectResponse[]> {
  const notion = getNotionClient();
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

  // 자식 블록이 있는 경우 재귀적으로 가져오기 (toggle, callout 등)
  for (const block of blocks) {
    if (block.has_children) {
      (
        block as BlockObjectResponse & { children: BlockObjectResponse[] }
      ).children = await getAllBlocks(block.id);
    }
  }

  return blocks;
}
