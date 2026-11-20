import { getPostHogEnvStatus, queryPostHog } from "./admin-posthog";
import { CARD_MEASUREMENT_VERSION } from "./blog/card-tracking";
import { readingPeriodRange, type ReadingPeriod } from "./blog/reading-report";

export async function fetchBlogCardReport(period: ReadingPeriod, now: Date) {
  const config = getPostHogEnvStatus();
  const range = readingPeriodRange(period, now);
  if (!config.projectIdConfigured || !config.apiKeyConfigured || !config.baseUrlConfigured) {
    return { configured: false as const };
  }

  const rows = await queryPostHog(`
    SELECT countIf(event = 'blog_card_impression') AS impressions,
           countIf(event = 'blog_card_clicked') AS clicks
    FROM events
    WHERE event IN ('blog_card_impression', 'blog_card_clicked')
      AND properties.$host IN ('www.born2smile.co.kr', 'born2smile.co.kr')
      AND properties.card_measurement_version = '${CARD_MEASUREMENT_VERSION}'
      AND timestamp >= toDateTime('${range.periodStart.slice(0, 19).replace("T", " ")}', 'UTC')
      AND timestamp < toDateTime('${range.periodEndExclusive.slice(0, 19).replace("T", " ")}', 'UTC')
  `, "blog_card_report");
  const impressions = Number(rows[0]?.impressions ?? 0);
  const clicks = Number(rows[0]?.clicks ?? 0);
  return { configured: true as const, period, range, impressions, clicks };
}

export type BlogCardReport = Awaited<ReturnType<typeof fetchBlogCardReport>>;
