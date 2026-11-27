import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { canOpenStaffPage, canUseAdminApi, hasPasswordAuthentication, OWNER_ACCESS, STAFF_ACCESS, type AdminAccess } from "../lib/admin-access";
import { siteHoursExceptionsSchema, siteHoursSchema } from "../lib/blog-validation";
import { HOURS } from "../lib/constants";

test("Google 세션과 인증 수단이 누락된 세션은 직원 비밀번호 로그인으로 인정하지 않는다", () => {
  assert.equal(hasPasswordAuthentication([{ method: "oauth" }]), false);
  assert.equal(hasPasswordAuthentication(undefined), false);
  assert.equal(hasPasswordAuthentication(["password"]), true);
  assert.equal(hasPasswordAuthentication([{ method: "password" }]), true);
});

test("직원은 콘텐츠·행정 업무를 사용하고 원장 전용 화면과 API는 차단된다", () => {
  const staff = STAFF_ACCESS;
  assert.equal(canOpenStaffPage("/staff/content/posts/draft"), true);
  assert.equal(canOpenStaffPage("/admin/system/monitoring"), false);
  assert.equal(canOpenStaffPage("/staff/system/settings"), true);
  assert.equal(canOpenStaffPage("/staff/system/hours"), true);
  assert.equal(canOpenStaffPage("/staff/system/first-visit"), true);
  assert.equal(canOpenStaffPage("/staff/system/first-visit/review"), true);
  assert.equal(canOpenStaffPage("/staff/system/insurance-forms"), true);
  assert.equal(canOpenStaffPage("/admin/operations/insurance-forms"), false);
  assert.equal(canOpenStaffPage("/admin/content/posts"), false);
  assert.equal(canUseAdminApi(staff, "GET", "/api/admin/site-config/clinic"), true);
  assert.equal(canUseAdminApi(staff, "GET", "/api/admin/site-config/hours"), true);
  for (const method of ["GET", "PUT", "DELETE"]) {
    assert.equal(canUseAdminApi(staff, method, "/api/admin/emergency-notice"), true);
  }
  assert.equal(canUseAdminApi(staff, "POST", "/api/admin/emergency-notice"), false);
  assert.equal(canUseAdminApi(staff, "PUT", "/api/admin/site-config/clinic"), false);
  assert.equal(canUseAdminApi(staff, "PUT", "/api/admin/site-config/hours"), false);
  assert.equal(canUseAdminApi(staff, "PATCH", "/api/admin/site-config/clinic"), false);
  assert.equal(canUseAdminApi(staff, "PATCH", "/api/admin/site-config/hours"), true);
  assert.equal(canUseAdminApi(staff, "GET", "/api/admin/site-config/links"), false);
  assert.equal(canUseAdminApi(staff, "PUT", "/api/admin/site-config/links"), false);
  assert.equal(canUseAdminApi(OWNER_ACCESS, "PUT", "/api/admin/site-config/links"), true);
  assert.equal(canUseAdminApi(OWNER_ACCESS, "PUT", "/api/admin/site-config/hours"), true);
  assert.equal(canUseAdminApi(staff, "GET", "/api/admin/blog-posts"), true);
  assert.equal(canUseAdminApi(staff, "PUT", "/api/admin/site-config/schedule"), false);
  assert.equal(canUseAdminApi(staff, "POST", "/api/admin/publication-review"), true);
  assert.equal(canUseAdminApi(staff, "POST", "/api/admin/content-revisions/123/apply"), false);
  assert.equal(canUseAdminApi(staff, "GET", "/api/dev/pagespeed"), false);
  assert.equal(canUseAdminApi(staff, "GET", "/api/admin/accounts"), false);
  assert.equal(canUseAdminApi(staff, "GET", "/api/admin/insurance-forms"), true);
  assert.equal(canUseAdminApi(staff, "GET", "/api/admin/insurance-forms/00000000-0000-4000-8000-000000000001"), true);
  assert.equal(canUseAdminApi(staff, "POST", "/api/admin/insurance-forms"), false);
  assert.equal(canUseAdminApi(staff, "DELETE", "/api/admin/insurance-forms/00000000-0000-4000-8000-000000000001"), false);
  assert.equal(canUseAdminApi(staff, "PUT", "/api/admin/accounts"), false);
  assert.equal(canUseAdminApi(OWNER_ACCESS, "POST", "/api/admin/content-revisions/123/apply"), true);
});

test("진료시간 부분 수정은 예외 일정만 허용한다", () => {
  const exceptions = [{ date: "2026-12-25", open: false, time: "휴진" }];
  assert.deepEqual(siteHoursExceptionsSchema.parse({ exceptions }), { exceptions });
  for (const field of ["schedule", "lunchTime", "closedDays", "notice"]) {
    assert.equal(siteHoursExceptionsSchema.safeParse({ exceptions, [field]: "" }).success, false);
  }
});

test("스태프 예외 일정 저장 중 원장이 기본 진료시간을 바꾸면 최신 값에 병합한다", async () => {
  const compiled = ts.transpileModule(readFileSync("lib/site-config-supabase.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exceptions = [{ date: "2026-12-25", open: false, time: "휴진" }];
  let row = { data: { lunchTime: "13:00 - 14:00", exceptions: [] as typeof exceptions }, updated_at: "2026-11-23T00:00:00.000Z" };
  let attempts = 0;
  let invalidations = 0;
  const eq = () => ({ maybeSingle: async () => ({ data: row }) });
  const from = () => ({
    select: () => ({ eq }),
    update: (change: typeof row) => ({
      eq: () => ({
        eq: (column: string, previous: string) => ({
          select: () => ({
            maybeSingle: async () => {
              assert.equal(column, "updated_at");
              if (attempts++ === 0) {
                row = { data: { ...row.data, lunchTime: "12:30 - 13:30" }, updated_at: "2026-11-23T00:00:01.000Z" };
              }
              if (row.updated_at !== previous) return { data: null };
              row = change;
              return { data: { type: "hours" } };
            },
          }),
        }),
      }),
    }),
  });
  const exports: { updateSiteHours?: (patch: { exceptions: typeof exceptions }, email: string) => Promise<string> } = {};
  const passthrough = (callback: unknown) => callback;
  const mocks: Record<string, unknown> = {
    react: { cache: passthrough },
    "next/cache": { unstable_cache: passthrough, revalidateTag: () => { invalidations++; } },
    "./site-config-local": { assertLiveSiteConfigWrite: () => {} },
    "./supabase-admin": { getSupabaseAdmin: () => ({ from }) },
    "./blog-validation": { siteHoursSchema },
    "./constants": { HOURS },
    "./site-hours-global-config": {
      syncGlobalConfigHours: async (readCurrent: () => Promise<{ hours: { lunchTime: string; exceptions: typeof exceptions } }>) => {
        const { hours } = await readCurrent();
        assert.equal(hours.lunchTime, "12:30 - 13:30");
        assert.deepEqual(hours.exceptions, exceptions);
        return true;
      },
    },
  };
  runInNewContext(compiled, { exports, require: (id: string) => mocks[id] ?? {} });
  assert.equal(await exports.updateSiteHours!({ exceptions }, "staff@example.invalid"), "synced");
  assert.equal(row.data.lunchTime, "12:30 - 13:30");
  assert.deepEqual(row.data.exceptions, exceptions);
  assert.equal(attempts, 2);
  assert.equal(invalidations, 1);
});

test("기존 콘텐츠 이메일과 직원 이메일은 동일한 직원 역할로 확인된다", () => {
  const compiled = ts.transpileModule(readFileSync("lib/admin-role-server.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: { getAdminAccess?: (email: string) => AdminAccess | null } = {};
  runInNewContext(compiled, {
    exports,
    require: () => ({ OWNER_ACCESS, STAFF_ACCESS }),
    process: { env: {
      ADMIN_EMAILS: "owner@example.invalid",
      ADMIN_OPERATIONS_EMAILS: "operations@example.invalid",
      ADMIN_CONTENT_EMAILS: " Writer@example.invalid ",
      ADMIN_STAFF_EMAILS: "staff@example.invalid,owner@example.invalid",
    } },
  });
  const access = exports.getAdminAccess!;
  assert.equal(access("staff@example.invalid"), STAFF_ACCESS);
  assert.equal(access("writer@example.invalid"), STAFF_ACCESS);
  assert.equal(access("owner@example.invalid"), OWNER_ACCESS);
  assert.equal(access("unknown@example.invalid"), null);
});

test("계정 중지는 환경변수 허용보다 우선하며 원장은 DB 장애와 관계없이 접근할 수 있다", async () => {
  const code = ts.transpileModule(readFileSync("lib/admin-account-store.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const configured = STAFF_ACCESS;
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
    } : id === "./admin-access" ? { STAFF_ACCESS } : { getSupabaseAdmin: () => ({ from: () => query }) },
  });
  const resolve = exports.resolveAdminAccess!;
  assert.equal(await resolve("staff@example.invalid"), null);
  result = { data: { enabled: true, permissions: ["content"] }, error: null };
  assert.equal(await resolve("staff@example.invalid"), STAFF_ACCESS);
  result = { data: null, error: { code: "PGRST205" } };
  assert.equal(await resolve("staff@example.invalid"), configured);
  result = { data: null, error: { code: "NETWORK" } };
  await assert.rejects(resolve("staff@example.invalid"));
  assert.equal(await resolve("owner@example.invalid"), OWNER_ACCESS);
  assert.equal(reads, 4);
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
        verifyAdminRequest: async () => ({ ok: true, access: STAFF_ACCESS }),
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
