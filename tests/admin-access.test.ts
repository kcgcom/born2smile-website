import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { canOpenAdminPage, canUseAdminApi, getAdminHome, hasPasswordAuthentication, OWNER_ACCESS, type AdminAccess } from "../lib/admin-access";

test("Google 세션과 인증 수단이 누락된 세션은 직원 비밀번호 로그인으로 인정하지 않는다", () => {
  assert.equal(hasPasswordAuthentication([{ method: "oauth" }]), false);
  assert.equal(hasPasswordAuthentication(undefined), false);
  assert.equal(hasPasswordAuthentication(["password"]), true);
  assert.equal(hasPasswordAuthentication([{ method: "password" }]), true);
});

test("직원 역할의 화면과 API 범위는 각각 허용된 작업으로 제한된다", () => {
  const content: AdminAccess = { isOwner: false, permissions: ["content"] };
  const staff: AdminAccess = { isOwner: false, permissions: ["staff"] };
  assert.equal(canOpenAdminPage(content, "/admin/content/posts/draft"), true);
  assert.equal(canOpenAdminPage(content, "/admin/system/monitoring"), false);
  assert.equal(canOpenAdminPage(staff, "/admin/system/settings"), true);
  assert.equal(canOpenAdminPage(staff, "/admin/content/posts"), false);
  assert.equal(canUseAdminApi(staff, "PUT", "/api/admin/site-config/hours"), true);
  assert.equal(canUseAdminApi(staff, "GET", "/api/admin/blog-posts"), false);
  assert.equal(canUseAdminApi(staff, "PUT", "/api/admin/site-config/schedule"), false);
  assert.equal(canUseAdminApi(content, "POST", "/api/admin/publication-review"), true);
  assert.equal(canUseAdminApi(content, "POST", "/api/admin/content-revisions/123/apply"), false);
  assert.equal(canUseAdminApi(content, "GET", "/api/dev/pagespeed"), false);
  assert.equal(canUseAdminApi(OWNER_ACCESS, "POST", "/api/admin/content-revisions/123/apply"), true);
});

test("업무 권한은 합산되며 세 권한을 모두 부여해도 원장 전용 API는 차단된다", () => {
  const access: AdminAccess = { isOwner: false, permissions: ["content", "staff", "operations"] };
  assert.equal(getAdminHome(access), "/admin/operations/overview");
  assert.equal(canOpenAdminPage(access, "/admin/system/monitoring"), true);
  assert.equal(canOpenAdminPage(access, "/admin/system/settings"), true);
  assert.equal(canOpenAdminPage(access, "/admin/content/posts"), true);
  assert.equal(canUseAdminApi(access, "GET", "/api/dev/pagespeed"), true);
  assert.equal(canUseAdminApi(access, "GET", "/api/dev/env-value"), false);
  assert.equal(canUseAdminApi(access, "POST", "/api/admin/content-revisions/123/apply"), false);
});

test("이메일 허용 목록 여러 곳에 등록하면 권한을 합산하고 원장은 전체 권한을 가진다", () => {
  const compiled = ts.transpileModule(readFileSync("lib/admin-role-server.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: { getAdminAccess?: (email: string) => AdminAccess | null } = {};
  runInNewContext(compiled, {
    exports,
    require: () => ({ OWNER_ACCESS }),
    process: { env: {
      ADMIN_EMAILS: "owner@example.invalid",
      ADMIN_OPERATIONS_EMAILS: "operations@example.invalid",
      ADMIN_CONTENT_EMAILS: " Staff@example.invalid ",
      ADMIN_STAFF_EMAILS: "staff@example.invalid",
    } },
  });
  const access = exports.getAdminAccess!;
  assert.equal(JSON.stringify(access("staff@example.invalid")), JSON.stringify({ isOwner: false, permissions: ["content", "staff"] }));
  assert.equal(access("owner@example.invalid"), OWNER_ACCESS);
  assert.equal(access("unknown@example.invalid"), null);
});

test("계정 중지는 환경변수 허용보다 우선하며 원장은 DB 장애와 관계없이 접근할 수 있다", async () => {
  const code = ts.transpileModule(readFileSync("lib/admin-account-store.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const configured: AdminAccess = { isOwner: false, permissions: ["staff"] };
  let result: { data: unknown; error: unknown } = { data: { enabled: false, permissions: ["staff"] }, error: null };
  let reads = 0;
  const query = {
    select: () => query, eq: () => query,
    maybeSingle: async () => { reads++; return result; },
  };
  const exports: { resolveAdminAccess?: (email: string) => Promise<AdminAccess | null> } = {};
  runInNewContext(code, {
    exports,
    require: (id: string) => id === "./admin-role-server" ? {
      getAdminAccess: (email: string) => email === "owner@example.invalid" ? OWNER_ACCESS : configured,
    } : { getSupabaseAdmin: () => ({ from: () => query }) },
  });
  const resolve = exports.resolveAdminAccess!;
  assert.equal(await resolve("staff@example.invalid"), null);
  result = { data: null, error: { code: "PGRST205" } };
  assert.equal(await resolve("staff@example.invalid"), configured);
  result = { data: null, error: { code: "NETWORK" } };
  await assert.rejects(resolve("staff@example.invalid"));
  assert.equal(await resolve("owner@example.invalid"), OWNER_ACCESS);
  assert.equal(reads, 3);
});

for (const [file, method] of [
  ["app/api/admin/blog-posts/route.ts", "POST"],
  ["app/api/admin/blog-posts/[slug]/route.ts", "PUT"],
] as const) {
  test(`콘텐츠 관리자의 ${method} 발행 요청은 DB 접근 전에 거부한다`, async () => {
    const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports: Record<string, (request: Request, context: { params: Promise<{ slug: string }> }) => Promise<Response>> = {};
    const mocks: Record<string, unknown> = {
      "../_lib/auth": {
        verifyAdminRequest: async () => ({ ok: true, access: { isOwner: false, permissions: ["operations", "content", "staff"] } }),
        forbidden: (message: string) => ({ status: 403, message }),
        unauthorizedResponse: (error: { status: number }) => Response.json(error, { status: error.status }),
      },
      "@/lib/blog-validation": {
        blogPostSchema: { parse: (body: unknown) => body },
        blogPostUpdateSchema: { parse: (body: unknown) => body },
      },
    };
    runInNewContext(compiled, {
      exports,
      Response,
      require: (id: string) => mocks[id === "../../_lib/auth" ? "../_lib/auth" : id] ?? {},
    });
    const response = await exports[method](
      new Request("https://example.invalid/api/admin/blog-posts", {
        method,
        body: JSON.stringify({ published: true, date: "2030-01-01" }),
      }),
      { params: Promise.resolve({ slug: "draft" }) },
    );
    assert.equal(response.status, 403);
  });
}
