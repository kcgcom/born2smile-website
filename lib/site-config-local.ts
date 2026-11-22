import { readFileSync } from "node:fs";
import { siteConfigSnapshotSchema, SITE_CONFIG_SNAPSHOT_PATH, type SiteConfigData } from "./site-config-snapshot-schema";

export function siteConfigSource(): "live" | "snapshot" | "fixture" {
  const source = process.env.SITE_CONFIG_DATA_SOURCE ?? (process.env.NODE_ENV === "development" ? "snapshot" : "live");
  if (!["live", "snapshot", "fixture"].includes(source)) throw new Error("Invalid SITE_CONFIG_DATA_SOURCE");
  // Build scripts may explicitly select snapshot; deployed runtimes must use live.
  if (source === "fixture" && process.env.NODE_ENV === "production") {
    throw new Error("Site config fixtures are for development/tests only");
  }
  return source as "live" | "snapshot" | "fixture";
}

export function localSiteConfig(): SiteConfigData | null {
  const source = siteConfigSource();
  if (source === "live") return null;
  // Empty overrides intentionally resolve to the fixed defaults in constants.ts.
  if (source === "fixture") return {};
  try {
    return readSiteConfigSnapshot();
  } catch {
    if (process.env.NODE_ENV === "production") throw new Error("Required build site-config snapshot is unavailable");
    // The preparation script reports missing/stale snapshots. Never fall through to DB.
    return {};
  }
}

export function readSiteConfigSnapshot(): SiteConfigData {
  const snapshot = siteConfigSnapshotSchema.parse(JSON.parse(readFileSync(SITE_CONFIG_SNAPSHOT_PATH, "utf8")));
  const expected = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (expected && snapshot.sourceOrigin !== new URL(expected).origin) throw new Error("Project mismatch");
  return snapshot.data;
}

export function assertLiveSiteConfigWrite(): void {
  if (siteConfigSource() !== "live") {
    throw new Error("개발용 설정 모드에서는 저장하지 않습니다. 운영 DB 편집이 필요하면 dev:live를 명시적으로 실행하세요.");
  }
}
