// =============================================================
// Notion 클라이언트 초기화
// =============================================================

import { Client } from "@notionhq/client";

/** Notion API 키와 블로그 DB ID가 모두 설정되었는지 확인 */
export function isNotionConfigured(): boolean {
  return !!(
    process.env.NOTION_API_KEY && process.env.NOTION_BLOG_DATABASE_ID
  );
}

let _client: Client | null = null;

/** Notion 클라이언트 싱글턴 */
export function getNotionClient(): Client {
  if (!_client) {
    _client = new Client({ auth: process.env.NOTION_API_KEY });
  }
  return _client;
}

export const NOTION_BLOG_DB_ID = process.env.NOTION_BLOG_DATABASE_ID ?? "";
