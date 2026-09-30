import { expect, test } from "@playwright/test";
import {
  classifyIndexStatus,
  getDailyInspectionLimit,
  getInspectionErrorStatus,
  getNextInspectionAt,
  getRunCompletionStatus,
  isValidCronAuthorization,
  nextObservationState,
  selectInspectionBatch,
  shouldAlertRunFailures,
} from "../lib/admin-indexing-monitor";

test.describe("색인 상태 감시", () => {
  test("Search Console 결과를 운영 상태로 분류한다", () => {
    expect(classifyIndexStatus({ verdict: "PASS", coverageState: "Submitted and indexed" }).status).toBe("indexed");
    expect(classifyIndexStatus({ verdict: "NEUTRAL", coverageState: "Discovered - currently not indexed" }).status).toBe("discovered");
    expect(classifyIndexStatus({ verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed" }).status).toBe("crawled-not-indexed");
    expect(classifyIndexStatus({ verdict: "NEUTRAL", coverageState: "URL is unknown to Google" }).status).toBe("unknown");
    expect(classifyIndexStatus({ verdict: "NEUTRAL", coverageState: "Duplicate, Google chose different canonical" }).status).toBe("excluded");
  });

  test("canonical의 후행 슬래시는 불일치로 보지 않는다", () => {
    expect(classifyIndexStatus({
      verdict: "PASS",
      userCanonical: "https://example.com/page/",
      googleCanonical: "https://example.com/page",
    }).canonicalMismatch).toBe(false);
    expect(classifyIndexStatus({
      verdict: "PASS",
      userCanonical: "https://example.com/page-a",
      googleCanonical: "https://example.com/page-b",
    }).canonicalMismatch).toBe(true);
  });

  test("미검사 URL과 가장 오래된 URL부터 배치에 넣는다", () => {
    const batch = selectInspectionBatch([
      { url: "https://example.com/b", inspectedAt: "2026-09-20T00:00:00Z" },
      { url: "https://example.com/a", inspectedAt: null },
      { url: "https://example.com/c", inspectedAt: "2026-09-10T00:00:00Z" },
    ], 2);
    expect(batch.map((item) => item.url)).toEqual([
      "https://example.com/a",
      "https://example.com/c",
    ]);
  });

  test("실패와 변경 확인 중 URL을 다음 배치에서 먼저 재검사한다", () => {
    const batch = selectInspectionBatch([
      { url: "https://example.com/old", inspectedAt: "2026-09-01T00:00:00Z" },
      { url: "https://example.com/pending", inspectedAt: "2026-09-30T00:00:00Z", pendingCount: 1 },
      { url: "https://example.com/failed", inspectedAt: "2026-09-30T00:00:00Z", error: "timeout" },
      { url: "https://example.com/new", inspectedAt: null },
    ], 3);
    expect(batch.map((item) => item.url)).toEqual([
      "https://example.com/failed",
      "https://example.com/pending",
      "https://example.com/new",
    ]);
  });

  test("아직 검사 시각이 되지 않은 URL은 배치에서 제외한다", () => {
    const batch = selectInspectionBatch([
      { url: "https://example.com/due", inspectedAt: "2026-09-01T00:00:00Z", nextInspectionAt: "2026-09-29T00:00:00Z" },
      { url: "https://example.com/future", inspectedAt: "2026-09-29T00:00:00Z", nextInspectionAt: "2026-10-29T00:00:00Z" },
    ], 10, "2026-09-30T00:00:00Z");
    expect(batch.map((item) => item.url)).toEqual(["https://example.com/due"]);
  });

  test("상태별 다음 검사 주기를 계산한다", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    expect(getNextInspectionAt("indexed", {}, now)).toBe("2026-10-30T00:00:00.000Z");
    expect(getNextInspectionAt("discovered", {}, now)).toBe("2026-10-07T00:00:00.000Z");
    expect(getNextInspectionAt("indexed", { canonicalMismatch: true }, now)).toBe("2026-10-07T00:00:00.000Z");
    expect(getNextInspectionAt("failed", { failed: true }, now)).toBe("2026-10-01T00:00:00.000Z");
  });

  test("사이트맵 크기에 따라 일일 검사량을 자동 조정한다", () => {
    expect(getDailyInspectionLimit(124)).toBe(50);
    expect(getDailyInspectionLimit(3_000)).toBe(100);
    expect(getDailyInspectionLimit(10_000)).toBe(200);
  });

  test("Google API 오류 상태를 식별한다", () => {
    expect(getInspectionErrorStatus({ response: { status: 429 } })).toBe(429);
    expect(getInspectionErrorStatus({ code: "403" })).toBe(403);
    expect(getInspectionErrorStatus(new Error("timeout"))).toBeNull();
  });

  test("성공과 실패 개수로 작업 결과를 판정한다", () => {
    expect(getRunCompletionStatus(50, 0)).toBe("completed");
    expect(getRunCompletionStatus(45, 5)).toBe("completed_with_errors");
    expect(getRunCompletionStatus(0, 5)).toBe("failed");
    expect(shouldAlertRunFailures(6, 4)).toBe(false);
    expect(shouldAlertRunFailures(5, 5)).toBe(true);
  });

  test("cron secret이 없거나 일치하지 않으면 인증을 거부한다", () => {
    expect(isValidCronAuthorization(undefined, "Bearer undefined")).toBe(false);
    expect(isValidCronAuthorization("", "Bearer ")).toBe(false);
    expect(isValidCronAuthorization("secret", null)).toBe(false);
    expect(isValidCronAuthorization("secret", "Bearer wrong")).toBe(false);
    expect(isValidCronAuthorization("secret", "Bearer secret")).toBe(true);
  });

  test("상태 변화는 두 번 연속 관측한 뒤 확정한다", () => {
    const first = nextObservationState("indexed", null, 0, "discovered");
    expect(first).toEqual({
      confirmedSignature: "indexed",
      pendingSignature: "discovered",
      pendingCount: 1,
      changed: false,
    });
    expect(nextObservationState(
      first.confirmedSignature,
      first.pendingSignature,
      first.pendingCount,
      "discovered",
    )).toEqual({
      confirmedSignature: "discovered",
      pendingSignature: null,
      pendingCount: 0,
      changed: true,
    });
    expect(nextObservationState("indexed", "discovered", 1, "indexed")).toEqual({
      confirmedSignature: "indexed",
      pendingSignature: null,
      pendingCount: 0,
      changed: false,
    });
  });
});
