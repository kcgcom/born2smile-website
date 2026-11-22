/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CJS module fixtures keep this check offline. */
// Run: node --test scripts/verify-research-settings.cjs
// All database and framework boundaries are mocked; no credentials or network are used.
require("tsx/cjs");
const assert = require("node:assert/strict");
const { test, beforeEach } = require("node:test");
const Module = require("node:module");

const state = { reads: [], writes: [], tags: [], single: {}, list: {}, writeError: null, noStore: 0 };
const requestCaches = [];
const persistentCache = new Map();
function stub(id, exports) {
  const filename = require.resolve(id);
  const fixture = new Module(filename);
  fixture.filename = filename;
  fixture.loaded = true;
  fixture.exports = exports;
  require.cache[filename] = fixture;
}
stub("react", {
  ...require("react"),
  cache(fn) {
    const memo = new Map();
    requestCaches.push(memo);
    return (...args) => {
      const key = JSON.stringify(args);
      if (!memo.has(key)) memo.set(key, Promise.resolve().then(() => fn(...args)));
      return memo.get(key);
    };
  },
});
stub("next/cache", {
  unstable_cache: (fn, keys) => (...args) => {
    const key = JSON.stringify([keys, args]);
    if (!persistentCache.has(key)) persistentCache.set(key, Promise.resolve().then(() => fn(...args)).catch((error) => { persistentCache.delete(key); throw error; }));
    return persistentCache.get(key);
  },
  revalidateTag: (...args) => { state.tags.push(args); persistentCache.clear(); },
  unstable_noStore: () => { state.noStore++; },
});
stub("../lib/supabase-admin.ts", {
  getSupabaseAdmin: () => ({
    rpc(name, args) {
      state.reads.push({ name, args });
      return Promise.resolve(state.rpc);
    },
    from(table) {
      const query = {
        select(fields) { state.reads.push({ table, fields, filters: [] }); return query; },
        eq(key, value) { state.reads.at(-1).filters.push([key, value]); return query; },
        in(key, values) { state.reads.at(-1).filters.push([key, values]); return query; },
        not(key, operator, value) { state.reads.at(-1).filters.push([key, operator, value]); return query; },
        order() { return query; },
        overrideTypes() { return query; },
        maybeSingle() { return Promise.resolve(state.single); },
        then(resolve, reject) { return Promise.resolve(state.list).then(resolve, reject); },
        upsert(row) { state.writes.push(row); return Promise.resolve({ error: state.writeError }); },
      };
      return query;
    },
  }),
});
const research = require("../lib/research/papers.ts");
const settings = require("../lib/site-config-supabase.ts");
const { RESEARCH_PAGES_SNAPSHOT } = require("../lib/research/generated/pages-snapshot.ts");

beforeEach(() => {
  state.reads = []; state.writes = []; state.tags = [];
  state.single = { data: null, error: null };
  state.list = { data: [], error: null };
  state.rpc = { data: [], error: null };
  state.writeError = null; state.noStore = 0;
  requestCaches.forEach((memo) => memo.clear());
  persistentCache.clear();
});

test("public hub performs one verified-only read and never returns unverified rows", async () => {
  state.rpc.data = [
    { card: { slug: "public" }, verified: true },
    { card: { slug: "private" }, verified: false },
  ];
  assert.deepEqual(await research.getAllResearchPagesFresh(), [{ slug: "public" }]);
  assert.equal(state.reads.length, 1);
  assert.deepEqual(state.reads[0], { name: "get_research_hub_cards", args: { p_include_unverified: false } });
});

test("public hub failures do not expose snapshot fallback", async () => {
  state.rpc.error = new Error("database unavailable");
  await assert.rejects(research.getAllResearchPagesFresh(), /목록을 확인하지 못했습니다/);
});

test("admin hub loads data and verification states in one read", async () => {
  state.rpc.data = [
    { card: { slug: "draft" }, verified: false },
    { card: { slug: "live" }, verified: true },
  ];
  assert.deepEqual(await research.getAllResearchPagesAdmin(), [
    { page: { slug: "draft" }, verified: false }, { page: { slug: "live" }, verified: true },
  ]);
  assert.equal(state.reads.length, 1);
});

test("admin-only snapshot fallback always marks entries unverified", async () => {
  state.rpc.error = new Error("database unavailable");
  const cards = await research.getAllResearchPagesAdmin();
  assert.deepEqual(cards.map(({ page, verified }) => [page.slug, page.paperCount, verified]),
    RESEARCH_PAGES_SNAPSHOT.map((page) => [page.slug, page.papers.length, false]));
});

test("public hub falls back to the existing verified-only query until migration", async () => {
  state.rpc.error = { code: "PGRST202" };
  const firstFinding = { stat: "95%", label: "대표 근거" };
  state.list.data = [{ slug: "public", verified: true, papers: [{ keyFindings: [firstFinding] }] }];
  assert.deepEqual(await research.getAllResearchPagesFresh(), [{ slug: "public", paperCount: 1, firstFinding }]);
  assert.deepEqual(state.reads[1].filters, [["data", "is", null], ["verified", true]]);
});

test("blog links check publication without selecting research content", async () => {
  state.list.data = [{ slug: "live" }];
  assert.deepEqual(await research.getPublicResearchSlugsFresh(["live", "draft"]), new Set(["live"]));
  assert.deepEqual(state.reads, [{
    table: "research_pages", fields: "slug",
    filters: [["verified", true], ["data", "is", null], ["slug", ["live", "draft"]]],
  }]);
});

test("metadata and body share a live row within a simulated render but refresh next render", async () => {
  state.single.data = { data: { slug: "live" }, verified: true };
  const [metadata, body] = await Promise.all([research.getResearchPageFresh("live"), research.getResearchPageFresh("live")]);
  assert.deepEqual(metadata, body);
  assert.equal(state.reads.length, 1);
  requestCaches.forEach((memo) => memo.clear());
  state.single.data.verified = false;
  assert.equal(await research.getResearchPageFresh("live"), undefined);
  assert.equal(state.reads.length, 2);
});

test("admin can reuse an unverified row without public access exposing it", async () => {
  state.single.data = { data: { slug: "draft" }, verified: false };
  assert.equal(await research.getResearchPageFresh("draft"), undefined);
  assert.deepEqual(await research.getResearchPageAdmin("draft"), { page: { slug: "draft" }, verified: false });
  assert.equal(state.reads.length, 1);
});

for (const [type, update, input, tag] of [
  ["links", settings.updateSiteLinks, { instagram: "https://example.com" }, "site-config-links"],
  ["clinic", settings.updateSiteClinic, { name: "테스트" }, "site-config-clinic"],
  ["hours", settings.updateSiteHours, { notice: "테스트" }, "site-config-hours"],
  ["schedule", settings.updateSiteSchedule, { publishDays: [1, 3] }, "site-config-schedule"],
]) {
  test(`${type}: failed current-value read never writes or invalidates`, async () => {
    state.single.error = new Error("read failed");
    await assert.rejects(update(input, "test"), /read failed/);
    assert.equal(state.writes.length, 0);
    assert.equal(state.tags.length, 0);
  });
  test(`${type}: failed save rejects without invalidating`, async () => {
    state.writeError = new Error("write failed");
    await assert.rejects(update(input, "test"), /write failed/);
    assert.equal(state.tags.length, 0);
  });
  test(`${type}: missing row can be created and successful save invalidates`, async () => {
    await update(input, "test");
    assert.equal(state.writes.length, 1);
    assert.equal(state.writes[0].type, type);
    assert.deepEqual(state.tags, [[tag, "max"]]);
  });
}

for (const [type, getter, field, value] of [
  ["links", settings.getSiteLinks, "instagram", "https://example.com/recovered"],
  ["clinic", settings.getSiteClinic, "name", "복구된 병원"],
  ["hours", settings.getSiteHours, "notice", "복구된 공지"],
  ["schedule", settings.getSiteSchedule, "publishDays", [2, 4]],
]) {
  test(`${type}: live read failures do not cache defaults and the next read recovers`, async () => {
    const errorLog = console.error;
    const logs = [];
    console.error = (...args) => logs.push(args);
    try {
      state.single.error = new Error("sensitive-credential-marker");
      state.list.error = state.single.error;
      await getter();
      assert.equal(persistentCache.size, 0);
      assert.equal(state.noStore, 1);
      assert.equal(logs.length, 1);
      assert.equal(JSON.stringify(logs).includes("sensitive-credential-marker"), false);
      state.single = { data: { data: { [field]: value } }, error: null };
      state.list = { data: [{ type, data: { [field]: value } }], error: null };
      requestCaches.forEach((memo) => memo.clear());
      const recovered = await getter();
      assert.deepEqual(recovered[field], value);
      assert.equal(state.reads.length, 2);
      assert.ok(persistentCache.size > 0);
    } finally { console.error = errorLog; }
  });
}

test("public settings share a single read for clinic, hours, and links", async () => {
  state.list.data = [
    { type: "clinic", data: { name: "테스트 치과" } },
    { type: "hours", data: { notice: "진료 안내" } },
    { type: "links", data: { instagram: "https://example.com/" } },
  ];
  const [clinic, hours, links] = await Promise.all([
    settings.getSiteClinic(), settings.getSiteHours(), settings.getSiteLinks(),
  ]);
  assert.equal(clinic.name, "테스트 치과");
  assert.equal(hours.notice, "진료 안내");
  assert.equal(links.instagram, "https://example.com/");
  assert.deepEqual(state.reads, [{
    table: "site_config", fields: "type, data",
    filters: [["type", ["links", "clinic", "hours"]]],
  }]);
});
