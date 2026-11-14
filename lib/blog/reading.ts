import type { BlogBlock } from "./types";

export const READING_VERSION = "blog_read_v1";
export const DEPTH_STEPS = [25, 50, 75, 90] as const;
export const TIME_STEPS = [15, 30, 60, 90] as const;
export const READING_IDLE_MS = 60_000;
export const MAX_READING_TICK_MS = 5_000;

export function isReadingBlock(block: BlogBlock): boolean {
  return block.type !== "relatedLinks" && !(block.type === "image" && (block.hidden || block.decorative));
}

function blockText(block: BlogBlock): string {
  if (!isReadingBlock(block)) return "";
  switch (block.type) {
    case "heading": case "paragraph": return block.text;
    case "list": return block.items.join(" ");
    case "faq": return `${block.question} ${block.answer}`;
    case "image": return block.caption ?? "";
    case "table": return [...block.headers, ...block.rows.flat()].join(" ");
    case "researchCallout": return `${block.title} ${block.description} ${block.linkText}`;
    default: return "";
  }
}

export function getReadingMetadata(blocks: BlogBlock[]) {
  const text = blocks.map(blockText).join(" ").replace(/\s+/g, " ").trim();
  const chars = Array.from(text).length;
  const estimated = Math.ceil(chars * 60 / 500);
  // Revision marker, not a cryptographic identifier. Never send source text.
  let hash = 2166136261;
  for (const char of JSON.stringify(blocks.filter(isReadingBlock))) {
    hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619) >>> 0;
  }
  return {
    measurement_version: READING_VERSION,
    content_revision: hash.toString(16).padStart(8, "0"),
    readable_char_count: chars,
    estimated_read_seconds: estimated,
    required_active_seconds: chars ? Math.ceil(Math.min(90, Math.max(15, estimated * 0.25))) : null,
    reading_eligible: chars > 0,
  };
}

export type ReadingMetadata = ReturnType<typeof getReadingMetadata>;

export function measureReadingRects(rects: Array<{ top: number; bottom: number; height: number }>, viewportHeight: number) {
  let total = 0;
  let reached = 0;
  let visible = false;
  for (const rect of rects) {
    if (rect.height <= 0) continue;
    if (rect.top < viewportHeight && rect.bottom > 0) visible = true;
    if (rect.top < viewportHeight) reached = total + Math.min(rect.height, Math.max(0, viewportHeight - rect.top));
    total += rect.height;
  }
  return { depth: total ? Math.min(100, reached / total * 100) : 0, visible };
}

export function activeReadingDelta(previous: number, now: number, lastActivity: number, active: boolean) {
  const elapsed = now - previous;
  if (!active || elapsed < 0 || elapsed > MAX_READING_TICK_MS) return 0;
  return Math.max(0, Math.min(now, lastActivity + READING_IDLE_MS) - previous);
}
