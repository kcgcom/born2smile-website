import type { BlogBlock, BlogRelatedLinkItem } from "./types";

const MAX_BLOG_BLOCKS = 60;

export { MAX_BLOG_BLOCKS };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeListStyle(value: unknown): "bullet" | "number" {
  if (value === "number" || value === "ordered") return "number";
  return "bullet";
}

function normalizeRelatedLinkItem(value: unknown): BlogRelatedLinkItem | null {
  if (!isRecord(value)) return null;

  const title = asString(value.title).trim();
  const href = asString(value.href).trim();
  const description = asString(value.description).trim();

  if (!title || !href) return null;

  return {
    title,
    href,
    ...(description ? { description } : {}),
  };
}

function normalizeBlock(value: unknown): BlogBlock[] {
  if (!isRecord(value)) return [];

  switch (value.type) {
    case "heading":
      return [{
        type: "heading",
        level: value.level === 3 ? 3 : 2,
        text: asString(value.text),
      }];
    case "paragraph":
      return [{ type: "paragraph", text: asString(value.text) }];
    case "list":
      return [{
        type: "list",
        style: normalizeListStyle(value.style),
        items: Array.isArray(value.items) ? value.items.map(asString) : [],
      }];
    case "faq":
      if (Array.isArray(value.items)) {
        return value.items
          .filter(isRecord)
          .map((item) => ({
            type: "faq",
            question: asString(item.question),
            answer: asString(item.answer),
          }));
      }

      return [{
        type: "faq",
        question: asString(value.question),
        answer: asString(value.answer),
      }];
    case "image":
      return [{
        type: "image",
        src: asString(value.src),
        alt: asString(value.alt),
        ...(typeof value.caption === "string" ? { caption: value.caption } : {}),
        ...(typeof value.width === "number" ? { width: value.width } : {}),
        ...(typeof value.height === "number" ? { height: value.height } : {}),
        ...(typeof value.hidden === "boolean" ? { hidden: value.hidden } : {}),
        ...(typeof value.decorative === "boolean" ? { decorative: value.decorative } : {}),
      }];
    case "relatedLinks":
      return [{
        type: "relatedLinks",
        items: Array.isArray(value.items)
          ? value.items.map(normalizeRelatedLinkItem).filter((item): item is BlogRelatedLinkItem => item !== null)
          : [],
      }];
    case "related-posts": {
      const links = Array.isArray(value.posts)
        ? value.posts.map(normalizeRelatedLinkItem).filter((item): item is BlogRelatedLinkItem => item !== null)
        : [];
      const title = asString(value.title).trim();

      return [
        ...(title ? [{ type: "heading" as const, level: 2 as const, text: title }] : []),
        ...(links.length > 0 ? [{ type: "relatedLinks" as const, items: links }] : []),
      ];
    }
    case "table":
      return [{
        type: "table",
        headers: Array.isArray(value.headers) ? value.headers.map(asString) : [],
        rows: Array.isArray(value.rows)
          ? value.rows.filter(Array.isArray).map((row) => row.map(asString))
          : [],
      }];
    case "researchCallout":
      return [{
        type: "researchCallout",
        title: asString(value.title),
        description: asString(value.description),
        href: asString(value.href),
        linkText: asString(value.linkText),
      }];
    case "callout": {
      const title = asString(value.title).trim();
      const text = asString(value.text).trim();

      return [
        ...(title ? [{ type: "heading" as const, level: 3 as const, text: title }] : []),
        ...(text ? [{ type: "paragraph" as const, text }] : []),
      ];
    }
    default:
      return [];
  }
}

export function normalizeBlogBlocks(value: unknown): BlogBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(normalizeBlock).slice(0, MAX_BLOG_BLOCKS);
}
