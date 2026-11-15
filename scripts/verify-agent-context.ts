import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { collectContext, createReader, parseTarget, validateBaseUrl } from "./agent/context";

async function main() {
  assert.equal(parseTarget("/treatments/scaling").category, "prevention");
  assert.equal(parseTarget("/blog/implant/implant-guide").slug, "implant-guide");
  for (const path of ["/admin", "/treatments/constructor", "/blog/constructor/example", "/blog/implant/../admin", "/treatments/implant?force=true"]) assert.throws(() => parseTarget(path));
  for (const url of ["https://example.invalid", "http://localhost.evil.invalid", "http://user:password@localhost:3000", "http://localhost:3000/api"]) assert.throws(() => validateBaseUrl(url));
  assert.equal(validateBaseUrl("http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  const calls: { url: URL; init: RequestInit }[] = [];
  const token = "test-only-not-a-credential";
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ url, init: init ?? {} });
    let data: unknown = {};
    if (url.pathname === "/api/admin/blog-posts") data = [
      { slug: "old-guide", title: "기존 글", category: "implant", date: "2020-01-01", published: true },
      { slug: "new-guide", title: "최근 글", category: "implant", date: "2021-01-01", published: true },
      { slug: "future-guide", category: "implant", date: "2099-01-01", published: true },
      { slug: "draft-guide", category: "implant", date: "2022-01-01", published: false },
      { slug: "other-guide", category: "prevention", date: "2022-01-01", published: true },
    ];
    else if (url.pathname === "/api/admin/blog-feedback") return new Response(JSON.stringify({ message: token }), { status: 503 });
    else if (url.pathname === "/api/admin/content-planner") data = [{ title: "보강 작업", targetPage: "/treatments/implant", category: "implant", createdBy: "private@example.invalid", sourceSnapshot: { actor: "private@example.invalid" } }];
    else if (url.pathname.endsWith("/performance")) data = { partial: true, feedback: { status: "ready", data: { solved: 0, unresolved: 0 } } };
    else if (url.pathname.endsWith("/source")) data = { source: "supabase", revision: "00000000-0000-4000-8000-000000000001", updatedAt: "2026-11-15T00:00:00Z", title: "본문", blocks: [{ type: "paragraph", text: "공개된 글의 내용입니다." }] };
    else if (url.pathname.includes("/blog-posts/")) data = { title: "본문" };
    return Response.json({ data });
  };
  const report = await collectContext({ target: "/treatments/implant", period: "30d", limit: 1, baseUrl: "http://localhost:3000", token, fetcher });
  assert.equal(report.partial, true);
  assert.deepEqual(report.content.map(item => item.slug), ["new-guide"]);
  assert.equal(report.selection.truncated, true);
  assert.equal(report.sources.feedback.status, "error");
  assert.equal(report.sources.feedback.data, null);
  assert.equal(report.content[0].performance.status, "partial");
  assert.equal(report.content[0].source.freshness, "database-live");
  assert.equal((await createReader("http://localhost:3000", token, fetcher)("/api/admin/blog-posts/performance-guide")).freshness, "unverified-may-fallback");
  assert.match(report.content[0].contentHash!, /^[a-f0-9]{64}$/);
  assert.equal(report.sources.search.effectivePeriod, "28d");
  assert.equal(report.sources.search.requestedPeriod, "30d");
  assert(calls.some(call => call.url.searchParams.get("includeClusters") === "false"));
  assert(calls.every(call => call.init.method === "GET" && call.init.redirect === "error" && new Headers(call.init.headers).get("Authorization") === `Bearer ${token}`));
  assert(!JSON.stringify(report).includes(token));
  assert(!JSON.stringify(report).includes("private@example.invalid"));
  const before = calls.length;
  const offline = await collectContext({ target: "/treatments/implant", period: "90d", limit: 1, baseUrl: "http://localhost:3000", token, fetcher, offline: true });
  assert.equal(calls.length, before);
  assert.equal(offline.sources.catalog.status, "skipped");
  assert.equal((await createReader("http://localhost:3000", undefined, fetcher)("/api/admin/blog-feedback")).status, "unconfigured");
  assert.equal((await createReader("http://localhost:3000", undefined, fetcher)("/api/admin/blog-feedback")).error, "AGENT_CONTENT_SECRET_MISSING");
  assert.equal(calls.length, before);
  await assert.rejects(() => createReader("http://localhost:3000", token, fetcher)("/api/admin/revalidate"));
  const empty = await createReader("http://localhost:3000", token, async () => Response.json({ data: null }))("/api/admin/analytics");
  assert.equal(empty.status, "unconfigured");
  const stale = await createReader("http://localhost:3000", token, async () => Response.json({ data: { title: "버전 없는 응답" } }))("/api/admin/blog-posts/example/source");
  assert.equal(stale.status, "error");
  assert.equal(stale.error, "INVALID_SOURCE_VERSION");
  const broken = await collectContext({ target: "/treatments/implant", period: "90d", limit: 1, baseUrl: "http://localhost:3000", token,
    fetcher: async () => Response.json({ data: { unexpected: true } }) });
  assert.equal(broken.sources.catalog.status, "error");
  assert.equal(broken.content.length, 0);
  const failed = await createReader("http://localhost:3000", token, async () => { throw new Error(token); })("/api/admin/blog-feedback");
  assert.equal(failed.status, "error");
  assert(!JSON.stringify(failed).includes(token));
  const output = `.tmp/agent-context/verify-${randomUUID()}.json`;
  try {
    const cli = spawnSync(process.execPath, ["--import", "tsx", "scripts/agent-context.ts", "--target", "/treatments/implant", "--offline", "--output", output], { encoding: "utf8" });
    assert.equal(cli.status, 2);
    const saved = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(saved.partial, true);
    assert.equal(saved.sources.catalog.status, "skipped");
    assert(saved.localFiles.length > 0);
    const again = spawnSync(process.execPath, ["--import", "tsx", "scripts/agent-context.ts", "--target", "/treatments/implant", "--offline", "--output", output], { encoding: "utf8" });
    assert.equal(again.status, 1);
    assert.equal(readFileSync(output, "utf8"), JSON.stringify(saved, null, 2) + "\n");
  } finally { rmSync(output, { force: true }); }
  console.log("Agent context verified: GET-only requests, origin restrictions, partial failures, period mapping, selection, privacy and offline mode.");
}

void main().catch(() => { console.error("Agent context verification failed."); process.exitCode = 1; });
