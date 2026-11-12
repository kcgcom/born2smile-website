import { expect, test } from "@playwright/test";
import { GET as rebuild } from "../app/api/cron/rebuild/route";
import { GET as searchadSync } from "../app/api/cron/searchad-sync/route";
import { GET as indexingMonitor } from "../app/api/cron/indexing-monitor/route";

// Only rejected requests: no authenticated jobs or remote writes are executed.
for (const [name, handler] of [["rebuild", rebuild], ["searchad-sync", searchadSync], ["indexing-monitor", indexingMonitor]] as const) {
  test(`${name}: 미설정·빈 비밀키·틀린 토큰은 실제 라우트에서 거부한다`, async () => {
    const previous = process.env.CRON_SECRET;
    try {
      for (const secret of [undefined, "", "test-only-secret"]) {
        if (secret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = secret;
        for (const authorization of [null, "Bearer undefined", "Bearer ", "Bearer wrong"]) {
          const response = await handler(new Request(`http://localhost/api/cron/${name}`, { headers: authorization ? { authorization } : {} }));
          expect(response.status).toBe(401);
        }
      }
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });
}
