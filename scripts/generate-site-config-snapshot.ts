import { mkdir, readFile, rename, writeFile, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfigDataSchema, siteConfigSnapshotSchema, SITE_CONFIG_SNAPSHOT_PATH, SITE_CONFIG_MAX_AGE_MS } from "../lib/site-config-snapshot-schema";

export async function prepareSiteConfigSnapshot(options: {
  force?: boolean; required?: boolean; offline?: boolean; output?: string;
  url?: string; key?: string; now?: number; fetcher?: typeof fetch;
} = {}) {
  const output = options.output ?? SITE_CONFIG_SNAPSHOT_PATH;
  const now = options.now ?? Date.now();
  const origin = options.url ? new URL(options.url).origin : undefined;
  let previous;
  try {
    previous = siteConfigSnapshotSchema.parse(JSON.parse(await readFile(output, "utf8")));
    if (origin && previous.sourceOrigin !== origin) previous = undefined;
  } catch { previous = undefined; }
  const age = previous ? now - Date.parse(previous.fetchedAt) : Infinity;
  if (!options.force && previous && age >= 0 && age < SITE_CONFIG_MAX_AGE_MS) {
    console.log(`[site-config] snapshot reused: ${previous.fetchedAt}`);
    return "reused";
  }
  try {
    if (options.offline || !origin || !options.key) throw new Error("Snapshot refresh unavailable");
    const url = new URL("/rest/v1/site_config", origin);
    url.searchParams.set("select", "type,data");
    url.searchParams.set("type", "in.(clinic,links,hours,schedule)");
    const response = await (options.fetcher ?? fetch)(url, {
      headers: { apikey: options.key, Authorization: `Bearer ${options.key}` },
      signal: AbortSignal.timeout(10000), redirect: "error",
    });
    if (!response.ok) throw new Error("Snapshot request failed");
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error("Invalid snapshot response");
    const data: Record<string, unknown> = {};
    for (const row of rows) {
      if (row && typeof row === "object" && ["clinic", "links", "hours", "schedule"].includes(row.type)) data[row.type] = row.data;
    }
    if (!["clinic", "links", "hours", "schedule"].every(type => type in data)) throw new Error("Incomplete snapshot");
    const snapshot = siteConfigSnapshotSchema.parse({
      version: 1, fetchedAt: new Date(now).toISOString(), sourceOrigin: origin,
      data: siteConfigDataSchema.parse(data),
    });
    await mkdir(dirname(output), { recursive: true });
    const temporary = `${output}.${process.pid}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(snapshot, null, 2) + "\n", { mode: 0o600 });
      await rename(temporary, output);
    } finally { await rm(temporary, { force: true }); }
    console.log(`[site-config] snapshot refreshed: ${snapshot.fetchedAt}`);
    return "refreshed";
  } catch {
    // Do not log request headers, credentials, URLs or response bodies.
    if (options.required) throw new Error("최신 사이트 설정을 가져오지 못해 빌드를 중단합니다.");
    if (!previous) await rm(output, { force: true });
    console.warn(previous
      ? `[site-config] refresh failed; using snapshot from ${previous.fetchedAt}`
      : "[site-config] refresh unavailable; using development defaults");
    return previous ? "stale" : "defaults";
  }
}

async function main() {
  const flags = new Set(process.argv.slice(2));
  const required = flags.has("--required");
  if (process.env.SITE_CONFIG_DATA_SOURCE === "fixture" && !required) {
    console.log("[site-config] fixed test defaults; no site_config database reads");
    return;
  }
  // Follow the existing snapshot scripts; preserve externally supplied variables.
  const inherited = new Set(Object.keys(process.env));
  for (const path of [".env", ".env.local"]) {
    let content;
    try { content = await readFile(path, "utf8"); } catch { continue; }
    for (const line of content.split(/\r?\n/)) {
      const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || inherited.has(match[1])) continue;
      process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  await prepareSiteConfigSnapshot({
    force: flags.has("--force"), required, offline: flags.has("--offline"),
    url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(() => { console.error("[site-config] required snapshot refresh failed"); process.exitCode = 1; });
}
