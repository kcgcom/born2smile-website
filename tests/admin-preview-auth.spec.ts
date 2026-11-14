import { expect, test } from "@playwright/test";

const PREVIEW = "/admin/preview/implant/test-unpublished-preview";

test("인증 쿠키가 없으면 미리보기에서 로그인으로 이동한다", async ({ request }) => {
  const response = await request.get(PREVIEW, { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location, response.url()).pathname).toBe("/admin/login");
});

test("쿠키 이름만으로 미리보기 권한을 얻을 수 없다", async ({ request }) => {
  // This unrelated cookie passes the proxy's presence check but supplies no
  // Supabase session. No fabricated access token is sent to the auth service.
  const response = await request.get(PREVIEW, {
    headers: { Cookie: "sb-preview-probe-auth-token=present" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location, response.url()).pathname).toBe("/admin/login");
});
