import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const origin = "https://www.born2smile.co.kr";
const firstPeriod = { firstDate: { year: 2026, month: 10, day: 19 }, lastDate: { year: 2026, month: 11, day: 15 } };
const lastPeriod = { firstDate: { year: 2026, month: 10, day: 26 }, lastDate: { year: 2026, month: 11, day: 22 } };
const daily = {
  key: { origin },
  collectionPeriod: lastPeriod,
  metrics: { cumulative_layout_shift: { percentiles: { p75: "0.00" } } },
};
const history = {
  key: { origin },
  collectionPeriods: [firstPeriod, lastPeriod],
  metrics: { cumulative_layout_shift: { percentilesTimeseries: { p75s: [null, "0.00"] } } },
};
const code = ts.transpileModule(readFileSync("app/api/dev/crux/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(options: { latest?: Response; trend?: Response; authenticated?: boolean; apiKey?: string } = {}) {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  const imports: Record<string, unknown> = {
    "next/cache": { unstable_cache: (query: () => unknown) => query },
    "@/app/api/admin/_lib/auth": {
      verifyAdminRequest: async () => ({ ok: options.authenticated ?? true }),
      unauthorizedResponse: () => new Response(null, { status: 401 }),
    },
    "@/lib/constants": { BASE_URL: origin },
  };
  runInNewContext(code, {
    exports, URL, Response, AbortSignal,
    require: (name: string) => imports[name],
    process: { env: { CRUX_API_KEY: options.apiKey ?? "test-only" } },
    fetch: async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(String(init.body)) });
      return url.endsWith(":queryRecord")
        ? options.latest ?? Response.json({ record: daily })
        : options.trend ?? Response.json({ record: history });
    },
  });
  return { requests, get: () => exports.GET!(new Request("http://localhost/api/dev/crux")) };
}

test("CrUX requires admin auth and a server key before making upstream requests", async () => {
  const anonymous = setup({ authenticated: false });
  const unconfigured = setup({ apiKey: "" });
  assert.equal((await anonymous.get()).status, 401);
  const response = await unconfigured.get();
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /키가 설정되지/);
  assert.deepEqual([...anonymous.requests, ...unconfigured.requests], []);
});

test("CrUX requests the origin for all devices and preserves CLS zero and missing periods", async () => {
  const { get, requests } = setup();
  const response = await get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const result = await response.json();
  assert.deepEqual(result.latest, { start: "2026-10-26", end: "2026-11-22", lcp: null, inp: null, cls: 0 });
  assert.deepEqual(result.history.map(({ cls }: { cls: number | null }) => cls), [null, 0]);
  assert.equal(result.historyError, null);
  assert.deepEqual(requests.map(({ url }) => new URL(url).pathname), ["/v1/records:queryRecord", "/v1/records:queryHistoryRecord"]);
  assert.equal(requests[1].body.collectionPeriodCount, 40);
  for (const { body } of requests) {
    assert.equal(body.origin, origin);
    assert.equal(body.formFactor, undefined);
    assert.equal(body.url, undefined);
  }
});

test("CrUX distinguishes no data from authentication and quota errors", async () => {
  const partial = setup({ latest: new Response(null, { status: 404 }), trend: new Response(null, { status: 429 }) });
  const response = await partial.get();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.latest, null);
  assert.equal(result.latestError, null);
  assert.match(result.historyError, /요청 한도/);
  const denied = setup({ latest: new Response(null, { status: 403 }), trend: new Response(null, { status: 403 }) });
  const failure = await denied.get();
  assert.equal(failure.status, 502);
  assert.match((await failure.json()).message, /인증 또는 설정/);
});

test("CrUX rejects invalid scope, dates, series length and values without discarding the other report", async () => {
  const invalidLatest = [
    { ...daily, key: { origin: "https://example.com" } },
    { ...daily, key: { origin, formFactor: "PHONE" } },
    { ...daily, collectionPeriod: { ...lastPeriod, lastDate: { year: 2026, month: 11, day: 31 } } },
    { ...daily, metrics: { cumulative_layout_shift: { percentiles: { p75: -1 } } } },
  ];
  for (const record of invalidLatest) {
    const { get } = setup({ latest: Response.json({ record }) });
    const response = await get();
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.latest, null);
    assert.match(result.latestError, /응답 형식/);
    assert.equal(result.history.length, 2);
  }
  const { get } = setup({ trend: Response.json({ record: { ...history, collectionPeriods: [lastPeriod] } }) });
  const result = await (await get()).json();
  assert.equal(result.latest.cls, 0);
  assert.deepEqual(result.history, []);
  assert.match(result.historyError, /응답 형식/);
});
