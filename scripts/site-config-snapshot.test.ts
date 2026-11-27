import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareSiteConfigSnapshot } from "./generate-site-config-snapshot";
import developmentConfig from "../playwright.config";
import productionConfig from "../playwright.production.config";
import { siteConfigDataSchema, SITE_CONFIG_MAX_AGE_MS, SITE_CONFIG_SNAPSHOT_PATH } from "../lib/site-config-snapshot-schema";
import { localSiteConfig, assertLiveSiteConfigWrite } from "../lib/site-config-local";

const now = Date.parse("2026-11-16T12:00:00Z");
const origin = "https://example.supabase.co";
const valid = (fetchedAt = now) => ({ version: 1, fetchedAt: new Date(fetchedAt).toISOString(), sourceOrigin: origin, data: {} });

async function isolated(run: (path: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "site-config-check-"));
  try { await run(join(dir, "snapshot.json")); } finally { await rm(dir, { recursive: true, force: true }); }
}

test("fresh matching snapshot makes no network request", () => isolated(async output => {
  await writeFile(output, JSON.stringify(valid()));
  const result = await prepareSiteConfigSnapshot({ output, now, url: origin, fetcher: async () => { throw new Error("must not fetch"); } });
  assert.equal(result, "reused");
}));

test("expiry refreshes all settings in one request and strips private keys", () => isolated(async output => {
  await writeFile(output, JSON.stringify(valid(now - SITE_CONFIG_MAX_AGE_MS)));
  let calls = 0;
  const result = await prepareSiteConfigSnapshot({ output, now, url: origin, key: "fake-test-key", fetcher: async (url, init) => {
    calls++;
    assert.equal(new URL(String(url)).searchParams.get("select"), "type,data");
    assert.equal(init?.method ?? "GET", "GET");
    return Response.json([
      { type: "clinic", data: { name: "테스트 치과", secret: "must-not-save" } },
      { type: "links", data: {} }, { type: "hours", data: {} }, { type: "schedule", data: {} },
      { type: "private", data: { key: "must-not-save" } },
    ]);
  } });
  assert.equal(result, "refreshed"); assert.equal(calls, 1);
  const content = await readFile(output, "utf8");
  assert.equal(content.includes("must-not-save"), false);
  assert.equal(content.includes("fake-test-key"), false);
}));

test("manual force refresh bypasses a fresh snapshot", () => isolated(async output => {
  await writeFile(output, JSON.stringify(valid()));
  let calls = 0;
  assert.equal(await prepareSiteConfigSnapshot({ output, now, url: origin, key: "fake", force: true, fetcher: async () => {
    calls++; return Response.json(["clinic", "links", "hours", "schedule"].map(type => ({ type, data: {} })));
  } }), "refreshed");
  assert.equal(calls, 1);
}));

test("failed optional refresh preserves previous bytes", () => isolated(async output => {
  const previous = JSON.stringify(valid(now - SITE_CONFIG_MAX_AGE_MS));
  await writeFile(output, previous);
  assert.equal(await prepareSiteConfigSnapshot({ output, now, url: origin, offline: true }), "stale");
  assert.equal(await readFile(output, "utf8"), previous);
}));

test("missing optional snapshot falls back without network", () => isolated(async output => {
  assert.equal(await prepareSiteConfigSnapshot({ output, now, offline: true }), "defaults");
}));

test("required refresh fails instead of silently using stale data", () => isolated(async output => {
  await writeFile(output, JSON.stringify(valid()));
  await assert.rejects(prepareSiteConfigSnapshot({ output, now, url: origin, force: true, required: true, offline: true }));
}));

test("fixture mode skips optional preparation and still attempts a required refresh", () => {
  const run = (...flags: string[]) => spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/generate-site-config-snapshot.ts", "--offline", ...flags],
    { encoding: "utf8", env: { ...process.env, SITE_CONFIG_DATA_SOURCE: "fixture" } },
  );

  const optional = run();
  assert.equal(optional.status, 0, optional.stderr);
  assert.match(optional.stdout, /fixed test defaults/);

  const required = run("--force", "--required");
  assert.equal(required.status, 1, required.stderr);
  assert.match(required.stderr, /required snapshot refresh failed/);
});

test("only the development Playwright server uses site-config fixtures", () => {
  const development = developmentConfig.webServer;
  const production = productionConfig.webServer;
  assert.ok(development && !Array.isArray(development));
  assert.ok(production && !Array.isArray(production));
  assert.equal(development.env?.SITE_CONFIG_DATA_SOURCE, "fixture");
  assert.equal(production.command, "pnpm start");
  assert.equal(production.env?.SITE_CONFIG_DATA_SOURCE, "snapshot");
  assert.equal(production.reuseExistingServer, false);
});

test("snapshot from another project is not reused", () => isolated(async output => {
  await writeFile(output, JSON.stringify(valid()));
  assert.equal(await prepareSiteConfigSnapshot({ output, now, url: "https://other.supabase.co", offline: true }), "defaults");
  await assert.rejects(readFile(output));
}));

test("future timestamps are not considered fresh", () => isolated(async output => {
  await writeFile(output, JSON.stringify(valid(now + 60000)));
  assert.equal(await prepareSiteConfigSnapshot({ output, now, url: origin, offline: true }), "stale");
}));

test("partial/error responses never replace a working snapshot", () => isolated(async output => {
  const previous = JSON.stringify(valid(now - SITE_CONFIG_MAX_AGE_MS));
  await writeFile(output, previous);
  assert.equal(await prepareSiteConfigSnapshot({ output, now, url: origin, key: "fake", fetcher: async () => Response.json([{ type: "clinic", data: {} }]) }), "stale");
  assert.equal(await readFile(output, "utf8"), previous);
}));

test("bad public field types are rejected", () => {
  assert.equal(siteConfigDataSchema.safeParse({ hours: { exceptions: [{ date: "2026-11-16", open: "yes", time: "" }] } }).success, false);
});

test("fixture reads use fixed defaults and block writes", () => {
  const source = process.env.SITE_CONFIG_DATA_SOURCE, mode = process.env.NODE_ENV;
  try {
    Object.assign(process.env, { NODE_ENV: "development" });
    process.env.SITE_CONFIG_DATA_SOURCE = "fixture";
    assert.deepEqual(localSiteConfig(), {});
    assert.throws(assertLiveSiteConfigWrite);
    process.env.SITE_CONFIG_DATA_SOURCE = "live";
    assert.equal(localSiteConfig(), null); assert.doesNotThrow(assertLiveSiteConfigWrite);
    process.env.SITE_CONFIG_DATA_SOURCE = "fixture";
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.throws(localSiteConfig);
  } finally {
    if (source === undefined) delete process.env.SITE_CONFIG_DATA_SOURCE; else process.env.SITE_CONFIG_DATA_SOURCE = source;
    if (mode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.assign(process.env, { NODE_ENV: mode });
  }
});

test("public getters and save guards make zero HTTP requests in fixture mode", async () => {
  const source = process.env.SITE_CONFIG_DATA_SOURCE;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    process.env.SITE_CONFIG_DATA_SOURCE = "fixture";
    globalThis.fetch = async () => { calls++; throw new Error("Unexpected HTTP request"); };
    const settings = await import("../lib/site-config-supabase");
    const [clinic, hours, links, schedule] = await Promise.all([
      settings.getSiteClinic(), settings.getSiteHours(), settings.getSiteLinks(), settings.getSiteSchedule(),
    ]);
    assert.equal(typeof clinic.name, "string");
    assert.equal(Array.isArray(hours.schedule), true);
    assert.equal(typeof links.naverMap, "string");
    assert.equal(Array.isArray(schedule.publishDays), true);
    await assert.rejects(settings.updateSiteHours({ notice: "test" }, "test"));
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (source === undefined) delete process.env.SITE_CONFIG_DATA_SOURCE; else process.env.SITE_CONFIG_DATA_SOURCE = source;
  }
});

test("missing local snapshot never falls through to live DB; build fails closed", () => isolated(async () => {
  const source = process.env.SITE_CONFIG_DATA_SOURCE, mode = process.env.NODE_ENV;
  const cwd = process.cwd();
  const dir = await mkdtemp(join(tmpdir(), "site-config-reader-"));
  try {
    process.chdir(dir);
    process.env.SITE_CONFIG_DATA_SOURCE = "snapshot";
    Object.assign(process.env, { NODE_ENV: "development" });
    assert.deepEqual(localSiteConfig(), {});
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.throws(localSiteConfig);
  } finally {
    process.chdir(cwd); await rm(dir, { recursive: true, force: true });
    if (source === undefined) delete process.env.SITE_CONFIG_DATA_SOURCE; else process.env.SITE_CONFIG_DATA_SOURCE = source;
    if (mode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.assign(process.env, { NODE_ENV: mode });
  }
}));

test("public hours fall back to the deployed snapshot with a visit warning", async () => {
  const cwd = process.cwd();
  const source = process.env.SITE_CONFIG_DATA_SOURCE;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dir = await mkdtemp(join(tmpdir(), "site-hours-fallback-"));
  try {
    process.chdir(dir);
    process.env.SITE_CONFIG_DATA_SOURCE = "live";
    process.env.NEXT_PUBLIC_SUPABASE_URL = origin;
    await mkdir(".cache/site-config", { recursive: true });
    await writeFile(SITE_CONFIG_SNAPSHOT_PATH, JSON.stringify({
      ...valid(),
      data: { hours: { notice: "배포 사본 공지", exceptions: [
        { date: "2000-01-01", time: "", open: false },
        { date: "2099-12-31", time: "", open: false },
      ] } },
    }));

    const { getSiteHours, getSiteHoursDraft, getSiteClinicDraft, getSiteLinksDraft, getSiteSchedule } = await import("../lib/site-config-supabase");
    const hours = await getSiteHours();
    assert.equal(hours.notice, "배포 사본 공지");
    assert.deepEqual(hours.exceptions.map(({ date }) => date), ["2099-12-31"]);
    assert.equal(hours.needsVisitConfirmation, true);
    for (const read of [getSiteHoursDraft, getSiteClinicDraft, getSiteLinksDraft, getSiteSchedule]) {
      await assert.rejects(read);
    }

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://other.supabase.co";
    const mismatched = await getSiteHours();
    assert.notEqual(mismatched.notice, "배포 사본 공지");
    assert.equal(mismatched.needsVisitConfirmation, true);
  } finally {
    process.chdir(cwd);
    if (source === undefined) delete process.env.SITE_CONFIG_DATA_SOURCE; else process.env.SITE_CONFIG_DATA_SOURCE = source;
    if (supabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    await rm(dir, { recursive: true, force: true });
  }
});
