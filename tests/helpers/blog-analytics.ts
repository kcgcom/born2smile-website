import type { Page } from "@playwright/test";
import { gunzipSync } from "node:zlib";
type Captured = { event: string; properties: Record<string, unknown> };

export async function interceptAnalytics(page: Page) {
  const events: Captured[] = [];
  const undecoded: string[] = [];
  await page.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return route.continue();
    // No test request may reach an external analytics or database service.
    if (url.pathname.endsWith("/rpc/get_like")) return route.fulfill({ json: [{ like_count: 0, like_users: [] }] });
    if (url.pathname.endsWith("/rpc/toggle_like")) return route.fulfill({ json: null });
    if (request.method() === "POST" && /\/(e|batch|capture)\/?$/.test(url.pathname)) {
      try {
        let body = request.postDataBuffer()!;
        if (body[0] === 0x1f && body[1] === 0x8b) body = gunzipSync(body);
        let text = body.toString("utf8");
        if (!text.startsWith("{") && !text.startsWith("[")) {
          const data = new URLSearchParams(text).get("data");
          if (data) text = Buffer.from(data, "base64").toString("utf8");
        }
        const payload = JSON.parse(text);
        for (const event of Array.isArray(payload) ? payload : [payload]) {
          if (event.event) {
            const properties = { ...event.properties };
            delete properties.token;
            events.push({ event: event.event, properties });
          }
        }
      } catch { undecoded.push(url.pathname); }
    }
    if (request.resourceType() === "script") return route.fulfill({ contentType: "application/javascript", body: "" });
    return route.fulfill({ headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS" }, json: { status: 1, featureFlags: {}, supportedCompression: [] } });
  });
  await page.addInitScript(() => {
    // Visitor measurement test: bypass only the SDK's automation exclusion.
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: false });
    Object.defineProperty(navigator, "userAgentData", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } });
  });
  return { events, undecoded };
}
