import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Execute the real route with isolated auth, DB, Google API and Next after() mocks.
// No test request can reach the connected database or consume PageSpeed quota.
const code = ts.transpileModule(readFileSync("app/api/dev/pagespeed/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const today = "2026-11-12";
type Row = { key: string; data: unknown };
const result = (strategy: string) => ({ strategy, fetchedAt: "2026-11-12T00:00:00Z", url: "https://www.born2smile.co.kr", categories: [], coreWebVitals: [], audits: [], overallCategory: "NONE" });

function setup(options: { rows?: Row[]; authorized?: boolean; dbError?: boolean; fetchError?: boolean; writeError?: boolean } = {}) {
  const calls: string[] = [];
  const writes: Row[] = [];
  const filters: string[] = [];
  const pending: (() => Promise<void>)[] = [];
  let pattern = "";
  const query = {
    select: () => query,
    like: (_column: string, value: string) => { pattern = value; filters.push(value); return query; },
    order: () => query,
    limit: async (limit: number) => {
      const regex = new RegExp(`^${pattern.replaceAll("%", ".*")}$`);
      return { data: (options.rows ?? []).filter((row) => regex.test(row.key)).sort((a, b) => b.key.localeCompare(a.key)).slice(0, limit), error: options.dbError ? new Error("DB unavailable") : null };
    },
    upsert: async (row: Row) => { writes.push(row); return { error: options.writeError ? new Error("Write failed") : null }; },
  };
  const mocks: Record<string, unknown> = {
    "next/server": { NextResponse: Response, after: (callback: () => Promise<void>) => pending.push(callback) },
    "@sentry/nextjs": { captureException: () => {} },
    "@/app/api/admin/_lib/auth": { verifyAdminRequest: async () => ({ ok: options.authorized !== false }), unauthorizedResponse: () => Response.json({ error: "UNAUTHORIZED" }, { status: 401 }) },
    "@/lib/supabase-admin": { getSupabaseAdmin: () => ({ from: () => query }) },
    "@/lib/date": { getTodayKST: () => today },
  };
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  runInNewContext(code, {
    exports, URL, URLSearchParams, Date, process: { env: { PAGESPEED_API_KEY: "test-only" } }, console: { error: () => {} },
    require: (id: string) => { assert.ok(id in mocks, `Unexpected dependency: ${id}`); return mocks[id]; },
    fetch: async (url: string) => {
      const parsed = new URL(url);
      assert.equal(parsed.hostname, "www.googleapis.com");
      calls.push(parsed.searchParams.get("strategy")!);
      return options.fetchError ? new Response("API unavailable", { status: 503 }) : Response.json({ lighthouseResult: { categories: { performance: { score: 0.9 } }, audits: {} } });
    },
  });
  return { calls, writes, filters, pending, get: (queryString: string) => exports.GET!(new Request(`http://localhost/api/dev/pagespeed${queryString}`)) };
}

test("인증 실패·누락 또는 잘못된 환경은 측정과 DB 접근 없이 거부한다", async () => {
  const denied = setup({ authorized: false });
  assert.equal((await denied.get("?strategy=mobile")).status, 401);
  assert.deepEqual(denied.calls, []);
  const api = setup();
  for (const suffix of ["", "?strategy=", "?strategy=both", "?strategy=tablet", "?force=true"]) {
    const response = await api.get(suffix);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
  assert.deepEqual(api.calls, []);
  assert.deepEqual(api.filters, []);
  assert.deepEqual(api.writes, []);
});

for (const strategy of ["mobile", "desktop"]) {
  test(`${strategy}: 오늘 캐시를 반환하고 다른 환경·통합 캐시는 조회하지 않는다`, async () => {
    const cached = result(strategy);
    const api = setup({ rows: [{ key: `psi-homepage-${today}-${strategy}`, data: cached }] });
    const response = await api.get(`?strategy=${strategy}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: { result: cached } });
    assert.deepEqual(api.filters, [`psi-homepage-%-${strategy}`]);
    assert.deepEqual(api.calls, []);
  });
  test(`${strategy}: 통합 캐시만 있으면 선택한 환경을 새로 측정한다`, async () => {
    const api = setup({ rows: [{ key: `psi-homepage-${today}`, data: { mobile: result("mobile"), desktop: result("desktop") } }] });
    const response = await api.get(`?strategy=${strategy}`);
    assert.equal((await response.json()).data.result.strategy, strategy);
    assert.deepEqual(api.calls, [strategy]);
    assert.equal(api.writes[0].key, `psi-homepage-${today}-${strategy}`);
  });
}

test("이전 환경별 캐시는 stale로 반환한 뒤 같은 환경만 갱신한다", async () => {
  const cached = result("desktop");
  const api = setup({ rows: [{ key: "psi-homepage-2026-11-11-desktop", data: cached }, { key: `psi-homepage-${today}-mobile`, data: result("mobile") }] });
  const response = await api.get("?strategy=desktop");
  assert.deepEqual(await response.json(), { data: { result: cached, stale: true } });
  assert.deepEqual(api.calls, []);
  assert.equal(api.pending.length, 1);
  await api.pending[0]();
  assert.deepEqual(api.calls, ["desktop"]);
  assert.equal(api.writes[0].key, `psi-homepage-${today}-desktop`);
});

test("force=true는 캐시를 건너뛰고 지정한 환경만 측정한다", async () => {
  const api = setup({ rows: [{ key: `psi-homepage-${today}-mobile`, data: result("mobile") }] });
  assert.equal((await api.get("?strategy=mobile&force=true")).status, 200);
  assert.deepEqual(api.filters, []);
  assert.deepEqual(api.calls, ["mobile"]);
});

test("DB 조회·저장 실패에도 불필요한 다른 환경 측정은 하지 않는다", async () => {
  for (const options of [{ dbError: true }, { writeError: true }]) {
    const api = setup(options);
    assert.equal((await api.get("?strategy=desktop")).status, 200);
    assert.deepEqual(api.calls, ["desktop"]);
  }
});

test("외부 측정 실패는 502이며 성공 캐시로 저장하지 않는다", async () => {
  const api = setup({ fetchError: true });
  assert.equal((await api.get("?strategy=mobile")).status, 502);
  assert.deepEqual(api.calls, ["mobile"]);
  assert.deepEqual(api.writes, []);
});
