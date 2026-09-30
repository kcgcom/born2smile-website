import { expect, test } from "@playwright/test";
import {
  getBlogLastModifiedDate,
  getMeaningfulDateModified,
} from "../lib/blog/dates";

test.describe("블로그 SEO 날짜", () => {
  test("발행일보다 늦은 수정일만 공개한다", () => {
    expect(getMeaningfulDateModified({
      date: "2026-03-01",
      dateModified: "2026-03-25",
    })).toBe("2026-03-25");

    expect(getMeaningfulDateModified({
      date: "2026-03-25",
      dateModified: "2026-03-25",
    })).toBeUndefined();

    expect(getMeaningfulDateModified({
      date: "2026-04-01",
      dateModified: "2026-03-25",
    })).toBeUndefined();
  });

  test("유효한 수정일이 없으면 사이트맵 lastmod는 발행일을 사용한다", () => {
    expect(getBlogLastModifiedDate({
      date: "2026-04-01",
      dateModified: "2026-03-25",
    }).toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });
});
