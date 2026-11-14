import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { classifyAgentContentAccess } from "../lib/agent-content-access";
import { createRevisionSchema, mapRevisionSource, revisionReadTime } from "../lib/content-revisions";

const secrets = { read: "test-read", draft: "test-draft", admin: "test-admin" };
const id = "00000000-0000-4000-8000-000000000001";
const candidate = { title: "검토용 수정안 제목", subtitle: "충분한 길이의 부제입니다", excerpt: "수정안 검증을 확인하기 위한 충분한 길이의 요약입니다.", category: "implant", tags: [], blocks: [{ type: "paragraph", text: "원본에 반영하기 전에 검토할 충분한 길이의 본문입니다." }] };
const input = { slug: "revision-example", baseRevision: id, reason: "부족한 설명을 보강합니다.", candidate };
assert(createRevisionSchema.safeParse(input).success);
assert(!createRevisionSchema.safeParse({ ...input, baseRevision: "old-version" }).success);
assert(!createRevisionSchema.safeParse({ ...input, published: true }).success);
for (const field of ["published", "date", "slug", "dateModified"]) assert(!createRevisionSchema.safeParse({ ...input, candidate: { ...candidate, [field]: field === "published" ? true : "2026-11-15" } }).success);
assert(!createRevisionSchema.safeParse({ ...input, candidate: { ...candidate, title: "짧음" } }).success);
assert(!createRevisionSchema.safeParse({ ...input, candidate: { ...candidate, category: "constructor" } }).success);
assert.equal(revisionReadTime(createRevisionSchema.parse(input).candidate), "1분");
const row = { ...candidate, slug: input.slug, revision: id, content: candidate.blocks, published: true, date: "2020-01-01", updated_at: "2026-11-15T00:00:00Z" };
const source = mapRevisionSource(row);
assert.equal(source.source, "supabase");
assert.equal(source.revision, id);
assert.throws(() => mapRevisionSource({ ...row, revision: undefined }));
for (const path of ["/api/admin/blog-posts", "/api/admin/blog-posts/revision-example/source", "/api/admin/content-revisions", `/api/admin/content-revisions/${id}`, "/api/admin/search-console", "/api/admin/naver-datalab/trend-summary"]) {
  assert.equal(classifyAgentContentAccess(secrets.read, "GET", path, secrets), "agent:read");
}
assert.equal(classifyAgentContentAccess(secrets.draft, "POST", "/api/admin/content-revisions", secrets), "agent:draft");
for (const token of [secrets.read, secrets.draft]) {
  for (const [method, path] of [["PUT", "/api/admin/blog-posts/revision-example"], ["POST", "/api/admin/blog-posts"], ["POST", `/api/admin/content-revisions/${id}/apply`], ["POST", "/api/admin/revalidate"], ["GET", "/api/dev/env-value"], ["GET", "/api/admin/site-config/clinic"]]) assert.equal(classifyAgentContentAccess(token, method, path, secrets), "denied");
}
assert.equal(classifyAgentContentAccess(secrets.read, "POST", "/api/admin/content-revisions", secrets), "denied");
assert.equal(classifyAgentContentAccess("browser-token", "GET", "/api/admin/blog-posts", secrets), "none");
assert.equal(classifyAgentContentAccess("same", "GET", "/api/admin/blog-posts", { read: "same", draft: "same" }), "misconfigured");
assert.equal(classifyAgentContentAccess("same", "GET", "/api/admin/blog-posts", { read: "same", admin: "same" }), "misconfigured");
const sql = readFileSync("supabase/migrations/026_blog_content_revisions.sql", "utf8");
assert(sql.includes("BEFORE UPDATE ON public.blog_posts"));
assert.equal((sql.match(/FOR UPDATE/g) ?? []).length, 3);
assert(sql.includes("current_post.revision <> proposal.base_revision"));
assert(sql.includes("current_post.revision <> p_base_revision"));
assert(sql.includes("UPDATE public.blog_content_revisions SET status = 'applied'"));
assert(!/\b(?:published|date|slug)\s*=/.test(sql.split("UPDATE public.blog_posts SET")[1].split("WHERE slug")[0]));
assert(sql.includes("REVOKE ALL ON FUNCTION public.apply_blog_content_revision"));
async function verifyRoutes() {
  // Test-only credentials live in this process; these paths must fail before DB access.
  process.env.ADMIN_CLI_SECRET = secrets.admin;
  process.env.AGENT_CONTENT_READ_SECRET = secrets.read;
  process.env.AGENT_CONTENT_DRAFT_SECRET = secrets.draft;
  process.env.ADMIN_EMAILS = "admin@example.invalid";
  const apply = await import("../app/api/admin/content-revisions/[id]/apply/route");
  const create = await import("../app/api/admin/content-revisions/route");
  const snapshot = await import("../app/api/admin/blog-posts/[slug]/source/route");
  const request = (path: string, method: string, token?: string, body?: unknown) => new Request(`http://localhost:3000${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  for (const token of [secrets.read, secrets.draft, secrets.admin]) {
    const result = await apply.POST(request(`/api/admin/content-revisions/${id}/apply`, "POST", token, { confirm: true }), { params: Promise.resolve({ id }) });
    assert.equal(result.status, 403);
    assert.equal(result.headers.get("Cache-Control"), "private, no-store");
  }
  assert.equal((await create.POST(request("/api/admin/content-revisions", "POST", secrets.read, input))).status, 403);
  assert.equal((await create.POST(request("/api/admin/content-revisions", "POST", secrets.draft, { ...input, published: true }))).status, 400);
  assert.equal((await snapshot.GET(request("/api/admin/blog-posts/example/source", "GET"), { params: Promise.resolve({ slug: "example" }) })).status, 401);
  mkdirSync(".tmp/revision-contract", { recursive: true });
  const file = `.tmp/revision-contract/${randomUUID()}.json`;
  try {
    writeFileSync(file, JSON.stringify(input));
    const valid = spawnSync(process.execPath, ["--import", "tsx", "scripts/agent-revision.ts", "--file", file, "--check"], { encoding: "utf8" });
    assert.equal(valid.status, 0);
    assert.deepEqual(JSON.parse(valid.stdout), { valid: true, slug: input.slug });
    writeFileSync(file, JSON.stringify({ ...input, candidate: { ...candidate, published: true } }));
    const invalid = spawnSync(process.execPath, ["--import", "tsx", "scripts/agent-revision.ts", "--file", file, "--check"], { encoding: "utf8" });
    assert.equal(invalid.status, 1);
  } finally { rmSync(file, { force: true }); }
  console.log("Content revision contracts verified: version requirement, immutable publication fields, scoped keys, API denial before DB access, schema validation, and migration locking structure. SQL execution requires a test PostgreSQL instance.");
}
void verifyRoutes().catch(error => { console.error(error instanceof Error ? error.message : "Verification failed"); process.exitCode = 1; });
