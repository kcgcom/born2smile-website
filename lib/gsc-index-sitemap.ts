import { SaxesParser } from "saxes";
import { BASE_URL } from "./constants";
import { getTodayKST } from "./date";

const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";
const VERIFICATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export type SitemapHoldReason = "sitemap_unavailable" | "verification_unavailable" | "url_mismatch";

interface SitemapSyncState {
  urls: string[];
  lastVerifiedAt: string | null;
  holdReason: SitemapHoldReason | null;
}

type SitemapSyncDecision =
  | { kind: "unchanged" }
  | { kind: "verified"; urls: string[] }
  | { kind: "deferred"; reason: SitemapHoldReason; differences: number | null };

function sortedUnique(urls: string[]): string[] {
  return [...new Set(urls)].sort();
}

function countUrlDifferences(left: string[], right: string[]): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return [...leftSet].filter((url) => !rightSet.has(url)).length
    + [...rightSet].filter((url) => !leftSet.has(url)).length;
}

export function parseSitemapUrls(xml: string): string[] {
  const origin = new URL(BASE_URL).origin;
  const parser = new SaxesParser({ xmlns: true });
  const urls: string[] = [];
  let depth = 0;
  let inUrl = false;
  let inLocation = false;
  let location: string | null = null;

  parser.on("doctype", () => { throw new Error("사이트맵 DOCTYPE은 지원되지 않습니다."); });
  parser.on("opentag", (tag) => {
    depth += 1;
    if (depth === 1 && (tag.local !== "urlset" || tag.uri !== SITEMAP_NS)) {
      throw new Error("사이트맵 루트가 올바르지 않습니다.");
    }
    if (inLocation) throw new Error("사이트맵 URL 형식이 올바르지 않습니다.");
    if (depth === 2 && tag.local === "url" && tag.uri === SITEMAP_NS) {
      inUrl = true;
      location = null;
    }
    if (depth === 3 && inUrl && tag.local === "loc" && tag.uri === SITEMAP_NS) {
      if (location !== null) throw new Error("사이트맵 URL 위치가 중복되었습니다.");
      inLocation = true;
      location = "";
    }
  });
  const appendLocation = (value: string) => { if (inLocation) location += value; };
  parser.on("text", appendLocation);
  parser.on("cdata", appendLocation);
  parser.on("closetag", () => {
    if (depth === 3) inLocation = false;
    if (depth === 2 && inUrl) {
      inUrl = false;
      const value = location?.trim();
      if (!value || /\s/.test(value)) throw new Error("사이트맵 URL이 없거나 잘못되었습니다.");
      const url = new URL(value);
      if (url.origin !== origin || url.username || url.password || url.hash) {
        throw new Error("사이트맵 URL이 공개 사이트 범위를 벗어났습니다.");
      }
      urls.push(value);
    }
    depth -= 1;
  });
  parser.write(xml).close();
  if (!urls.length) throw new Error("사이트맵 URL 목록이 비어 있습니다.");
  return sortedUnique(urls);
}

export async function decideSitemapSync(
  state: SitemapSyncState,
  readSitemap: () => Promise<string[]>,
  readExpectedUrls: () => Promise<string[]>,
  now: Date,
): Promise<SitemapSyncDecision> {
  let urls: string[];
  try {
    urls = sortedUnique(await readSitemap());
    if (!urls.length) throw new Error("사이트맵 URL 목록이 비어 있습니다.");
  } catch {
    return { kind: "deferred", reason: "sitemap_unavailable", differences: null };
  }

  const verificationDue = !state.lastVerifiedAt
    || Date.parse(getTodayKST(now)) - Date.parse(getTodayKST(new Date(state.lastVerifiedAt))) >= VERIFICATION_INTERVAL_MS;
  if (!state.holdReason && !verificationDue && countUrlDifferences(state.urls, urls) === 0) {
    return { kind: "unchanged" };
  }

  let expectedUrls: string[];
  try {
    expectedUrls = await readExpectedUrls();
  } catch {
    return { kind: "deferred", reason: "verification_unavailable", differences: null };
  }

  const differences = countUrlDifferences(urls, expectedUrls);
  return differences
    ? { kind: "deferred", reason: "url_mismatch", differences }
    : { kind: "verified", urls };
}
