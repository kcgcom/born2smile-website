import { expect, test } from "@playwright/test";
import { toSitemapStatus } from "../lib/admin-search-console";

test.describe("Search Console sitemap 상태", () => {
  test("정상 sitemap 응답을 관리자 상태로 변환한다", () => {
    const status = toSitemapStatus({
      path: "https://www.born2smile.co.kr/sitemap.xml",
      isPending: false,
      lastSubmitted: "2026-09-30T04:55:07.765Z",
      lastDownloaded: "2026-09-30T04:55:14.843Z",
      warnings: "0",
      errors: "0",
      contents: [{ type: "web", submitted: "124", indexed: "0" }],
    }, "2026-09-30T05:00:00.000Z");

    expect(status).toEqual({
      status: "healthy",
      path: "https://www.born2smile.co.kr/sitemap.xml",
      isPending: false,
      lastSubmitted: "2026-09-30T04:55:07.765Z",
      lastDownloaded: "2026-09-30T04:55:14.843Z",
      warnings: 0,
      errors: 0,
      submittedUrlCount: 124,
      checkedAt: "2026-09-30T05:00:00.000Z",
    });
  });

  test("오류, 경고, 처리 중 상태를 우선순위대로 분류한다", () => {
    expect(toSitemapStatus({ errors: "2", warnings: "1", isPending: true }).status).toBe("error");
    expect(toSitemapStatus({ errors: "0", warnings: "1", isPending: true }).status).toBe("warning");
    expect(toSitemapStatus({ errors: "0", warnings: "0", isPending: true }).status).toBe("pending");
  });
});
