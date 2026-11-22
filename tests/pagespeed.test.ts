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
const result = (strategy: string, fetchedAt = "2026-11-11T15:00:00Z") => ({ strategy, fetchedAt, url: "https://www.born2smile.co.kr", categories: [], coreWebVitals: [], audits: [], overallCategory: "NONE" });

function setup(options: {
  rows?: Row[];
  authorized?: boolean;
  dbError?: boolean;
  fetchError?: boolean;
  writeError?: boolean;
  beforeFetch?: () => Promise<void>;
  beforePoll?: () => Promise<void>;
} = {}) {
  const rows = [...(options.rows ?? [])];
  const calls: string[] = [];
  const writes: Row[] = [];
  const filters: string[] = [];
  const pending: (() => Promise<void>)[] = [];
  const measurementLogs: { strategy: string; trigger: string; cachedFetchedAt?: string; measured: boolean }[] = [];
  const runs = new Map<string, { run_id: string; started_at: string; expires_at: string | null; retry_at: string | null }>();
  let runCount = 0;
  const from = (table: string) => {
    let pattern = "";
    let limit = 1;
    const query = {
      select: () => query,
      eq: (_column: string, value: string) => {
        pattern = value;
        if (table === "api_cache") filters.push(value);
        return query;
      },
      maybeSingle: async () => {
        if (table === "pagespeed_measurement_runs") await options.beforePoll?.();
        return {
          data: table === "api_cache" ? rows.find((row) => row.key === pattern) : runs.get(pattern),
          error: options.dbError ? new Error("DB unavailable") : null,
        };
      },
      like: (_column: string, value: string) => { pattern = value; filters.push(value); return query; },
      order: () => query,
      limit: (count: number) => { limit = count; return query; },
      abortSignal: () => query,
      then: (resolve: (response: { data: Row[]; error: null }) => unknown) => {
        const regex = new RegExp(`^${pattern.replaceAll("%", ".*").replaceAll("_", ".")}$`);
        return resolve({
          data: rows.filter((row) => regex.test(row.key)).sort((a, b) => b.key.localeCompare(a.key)).slice(0, limit),
          error: null,
        });
      },
    };
    return query;
  };
  const rpc = (name: string, args: { p_strategy: string; p_manual?: boolean; p_run_id?: string; p_result?: unknown }) => {
    const strategy = args.p_strategy;
    return {
      abortSignal: async () => {
        if (options.dbError) return { error: new Error("DB unavailable") };
        const previous = runs.get(strategy);
        if (name === "claim_pagespeed_measurement") {
          if (previous?.expires_at) return { data: { status: "running", runId: previous.run_id, startedAt: previous.started_at } };
          if (previous?.retry_at && !args.p_manual) return { data: { status: "cooldown" } };
          const run = {
            run_id: String(++runCount),
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 100_000).toISOString(),
            retry_at: null,
          };
          runs.set(strategy, run);
          return { data: { status: "claimed", runId: run.run_id, startedAt: run.started_at } };
        }
        assert.equal(name, "finish_pagespeed_measurement");
        assert.equal(previous?.run_id, args.p_run_id);
        assert.ok(previous);
        if (options.writeError) return { error: new Error("Write failed") };
        previous.expires_at = null;
        if (args.p_result) {
          const row = { key: `psi-homepage-latest-${strategy}`, data: structuredClone(args.p_result) };
          writes.push(row);
          rows.unshift(row);
        } else {
          previous.retry_at = new Date(Date.now() + 300_000).toISOString();
        }
        return { data: true };
      },
    };
  };
  const mocks: Record<string, unknown> = {
    "next/server": { NextResponse: Response, after: (callback: () => Promise<void>) => pending.push(callback) },
    "@sentry/nextjs": { captureException: () => {} },
    "@/app/api/admin/_lib/auth": { verifyAdminRequest: async () => ({ ok: options.authorized !== false }), unauthorizedResponse: () => Response.json({ error: "UNAUTHORIZED" }, { status: 401 }) },
    "@/lib/supabase-admin": { getSupabaseAdmin: () => ({ from, rpc }) },
    "@/lib/date": { getTodayKST: (date?: Date) => date ? new Date(date.getTime() + 9 * 3_600_000).toISOString().slice(0, 10) : today },
    "node:timers/promises": { setTimeout: async () => {} },
  };
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  runInNewContext(code, {
    exports, URL, URLSearchParams, AbortSignal, Date, process: { env: { PAGESPEED_API_KEY: "test-only" } },
    console: {
      error: () => {},
      info: (message: string, details: (typeof measurementLogs)[number]) => {
        if (message === "PSI measurement started") return;
        assert.equal(message, "PSI measurement");
        measurementLogs.push(details);
      },
    },
    require: (id: string) => { assert.ok(id in mocks, `Unexpected dependency: ${id}`); return mocks[id]; },
    fetch: async (url: string) => {
      const parsed = new URL(url);
      assert.equal(parsed.hostname, "www.googleapis.com");
      calls.push(parsed.searchParams.get("strategy")!);
      await options.beforeFetch?.();
      return options.fetchError ? new Response("API unavailable", { status: 503 }) : Response.json({ lighthouseResult: { categories: { performance: { score: 0.9 } }, audits: {} } });
    },
  });
  return { calls, writes, filters, pending, measurementLogs, get: (queryString: string) => exports.GET!(new Request(`http://localhost/api/dev/pagespeed${queryString}`)) };
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
    const api = setup({ rows: [{ key: `psi-homepage-latest-${strategy}`, data: cached }] });
    const response = await api.get(`?strategy=${strategy}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: { result: cached } });
    assert.deepEqual(api.filters, [`psi-homepage-latest-${strategy}`]);
    assert.deepEqual(api.calls, []);
  });
  test(`${strategy}: 통합 캐시만 있으면 선택한 환경을 새로 측정한다`, async () => {
    const api = setup({ rows: [{ key: `psi-homepage-${today}`, data: { mobile: result("mobile"), desktop: result("desktop") } }] });
    const response = await api.get(`?strategy=${strategy}`);
    assert.equal((await response.json()).data.result.strategy, strategy);
    assert.deepEqual(api.calls, [strategy]);
    assert.equal(api.writes[0].key, `psi-homepage-latest-${strategy}`);
  });
}

test("이전 환경별 캐시는 stale로 반환한 뒤 같은 환경만 갱신한다", async () => {
  const cached = result("desktop", "2026-11-11T14:59:59Z");
  const api = setup({ rows: [{ key: "psi-homepage-2026-11-11-desktop", data: cached }, { key: `psi-homepage-${today}-mobile`, data: result("mobile") }] });
  const response = await api.get("?strategy=desktop");
  assert.deepEqual(await response.json(), { data: { result: cached, stale: true } });
  assert.deepEqual(api.calls, []);
  assert.equal(api.pending.length, 1);
  await api.pending[0]();
  assert.deepEqual(api.calls, ["desktop"]);
  assert.equal(api.writes[0].key, "psi-homepage-latest-desktop");
  assert.equal(api.measurementLogs.length, 1);
  assert.equal(api.measurementLogs[0].strategy, "desktop");
  assert.equal(api.measurementLogs[0].trigger, "background");
  assert.equal(api.measurementLogs[0].cachedFetchedAt, cached.fetchedAt);
  assert.equal(api.measurementLogs[0].measured, true);
});

test("최신 성공 결과가 이전 한국 날짜이면 실패한 백그라운드 측정으로 덮어쓰지 않는다", async () => {
  const cached = result("mobile", "2026-11-11T14:59:59Z");
  const api = setup({ rows: [{ key: "psi-homepage-latest-mobile", data: cached }], fetchError: true });
  const response = await api.get("?strategy=mobile");
  assert.deepEqual(await response.json(), { data: { result: cached, stale: true } });
  await api.pending[0]();
  assert.deepEqual(api.calls, ["mobile"]);
  assert.deepEqual(api.writes, []);
  assert.equal(api.measurementLogs[0].measured, false);
});

test("force=true는 캐시를 건너뛰고 지정한 환경만 측정한다", async () => {
  const api = setup({ rows: [{ key: "psi-homepage-latest-mobile", data: result("mobile") }] });
  assert.equal((await api.get("?strategy=mobile&force=true")).status, 200);
  assert.deepEqual(api.filters, []);
  assert.deepEqual(api.calls, ["mobile"]);
  assert.equal(api.writes[0].key, "psi-homepage-latest-mobile");
  assert.equal(api.measurementLogs.length, 1);
  assert.equal(api.measurementLogs[0].trigger, "manual");
});

test("실행 권한을 확인할 수 없으면 외부 측정을 시작하지 않는다", async () => {
  const api = setup({ dbError: true });
  assert.equal((await api.get("?strategy=desktop&force=true")).status, 502);
  assert.deepEqual(api.calls, []);
});

test("결과 저장이 실패하면 같은 요청에서 재측정하지 않는다", async () => {
  const api = setup({ writeError: true });
  assert.equal((await api.get("?strategy=desktop")).status, 502);
  assert.deepEqual(api.calls, ["desktop"]);
});

test("수동 요청 두 건이 진행 중인 같은 환경의 결과를 공유한다", async () => {
  const started = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  const api = setup({
    beforeFetch: () => { started.resolve(); return finish.promise; },
    beforePoll: async () => { finish.resolve(); await first; },
  });
  const first = api.get("?strategy=mobile&force=true");
  await started.promise;
  const second = api.get("?strategy=mobile&force=true");
  const [firstResponse, secondResponse] = await Promise.all([first, second]);
  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.deepEqual(await secondResponse.json(), await firstResponse.json());
  assert.deepEqual(api.calls, ["mobile"]);
});

test("수동 요청은 진행 중인 백그라운드 측정 결과를 공유한다", async () => {
  const started = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  const api = setup({
    rows: [{ key: "psi-homepage-latest-mobile", data: result("mobile", "2026-11-11T14:59:59Z") }],
    beforeFetch: () => { started.resolve(); return finish.promise; },
    beforePoll: async () => { finish.resolve(); await background; },
  });
  const stale = await api.get("?strategy=mobile");
  assert.equal((await stale.json()).data.stale, true);
  const background = api.pending[0]();
  await started.promise;
  const response = await api.get("?strategy=mobile&force=true");
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data.result, api.writes[0].data);
  assert.deepEqual(api.calls, ["mobile"]);
});

test("실패 후 자동 재측정을 쉬는 동안 수동 측정을 허용한다", async () => {
  const api = setup({
    rows: [{ key: "psi-homepage-latest-mobile", data: result("mobile", "2026-11-11T14:59:59Z") }],
    fetchError: true,
  });
  await api.get("?strategy=mobile");
  await api.pending[0]();
  await api.get("?strategy=mobile");
  await api.pending[1]();
  assert.deepEqual(api.calls, ["mobile"]);
  assert.equal((await api.get("?strategy=mobile&force=true")).status, 502);
  assert.deepEqual(api.calls, ["mobile", "mobile"]);
});

test("외부 측정 실패는 502이며 성공 캐시로 저장하지 않는다", async () => {
  const api = setup({ fetchError: true });
  assert.equal((await api.get("?strategy=mobile")).status, 502);
  assert.deepEqual(api.calls, ["mobile"]);
  assert.deepEqual(api.writes, []);
});
