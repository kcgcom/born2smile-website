import { getPostHogEnvStatus, queryPostHog } from "./admin-posthog";
import { KAKAO_EVENTS, PHONE_EVENTS } from "./analytics-events";
import { READING_VERSION } from "./blog/reading";
import { BLOG_CATEGORY_SLUGS } from "./blog/types";
import { readingPeriodRange, type ReadingCounts, type ReadingPeriod, type ReadingReport } from "./blog/reading-report";

const PAGE_SIZE = 25;
const HOSTS = "properties.$host IN ('www.born2smile.co.kr', 'born2smile.co.kr')";
const READ_EVENTS = "('blog_article_viewed','blog_read_progress','blog_read_qualified','blog_feedback_prompt_viewed','blog_question_feedback','blog_post_shared')";
const CONTACT_EVENTS = `(${[...PHONE_EVENTS, ...KAKAO_EVENTS].map(event => `'${event}'`).join(",")})`;
const COUNT_KEYS = ["visits", "eligibleVisits", "qualified", "depth75", "time30", "feedbackPrompts", "solved", "unresolved", "shares", "inquiries"] as const;

function counts(row: Record<string, unknown> = {}): ReadingCounts {
  return Object.fromEntries(COUNT_KEYS.map(key => [key, Number(row[key] ?? 0)])) as unknown as ReadingCounts;
}

export function buildReadingQueries(period: ReadingPeriod, cursor: string | null, now = new Date()) {
  if (cursor !== null && !/^[a-z0-9][a-z0-9-]{0,199}$/.test(cursor)) throw new Error("Invalid reading cursor");
  const range = readingPeriodRange(period, now);
  const date = (value: string) => value.replace("T", " ").slice(0, 19);
  const where = `timestamp >= toDateTime('${date(range.periodStart)}', 'UTC') AND timestamp < toDateTime('${date(range.periodEndExclusive)}', 'UTC') AND ${HOSTS}`;
  const valid = `properties.measurement_version = '${READING_VERSION}'
    AND notEmpty(toString(ifNull(properties.article_view_id, '')))
    AND notEmpty(toString(ifNull(properties.article_session_id, '')))
    AND properties.article_session_id = properties.$session_id
    AND notEmpty(toString(ifNull(properties.content_revision, '')))
    AND properties.page_type = 'blog_post'
    AND match(properties.page_path, '^/blog/(${BLOG_CATEGORY_SLUGS.join("|")})/[^/]+$')
    AND properties.blog_slug = extract(properties.page_path, '^/blog/[^/]+/([^/]+)$')
    AND properties.category = extract(properties.page_path, '^/blog/([^/]+)/')
    AND properties.readable_char_count >= 0 AND properties.estimated_read_seconds >= 0
    AND ((properties.reading_eligible = true AND properties.readable_char_count > 0
      AND properties.required_active_seconds >= 15 AND properties.required_active_seconds <= 90)
      OR (properties.reading_eligible = false AND properties.readable_char_count = 0 AND properties.required_active_seconds IS NULL))
    AND (event NOT IN ('blog_read_progress','blog_read_qualified')
      OR (properties.active_read_seconds >= 0 AND properties.max_body_depth_pct >= 0 AND properties.max_body_depth_pct <= 100))
    AND (event != 'blog_read_progress'
      OR (properties.milestone_type = 'depth' AND properties.milestone_value IN (25,50,75,90))
      OR (properties.milestone_type = 'active_time' AND properties.milestone_value IN (15,30,60,90)))`;
  const cte = `WITH raw AS (
    SELECT * FROM events WHERE ${where} AND event IN ${READ_EVENTS}
  ), valid_events AS (
    SELECT * FROM raw WHERE ${valid}
  ), views AS (
    SELECT properties.article_view_id AS view_id, properties.article_session_id AS session_id,
      properties.blog_slug AS slug, properties.content_revision AS revision,
      any(properties.page_path) AS path,
      countIf(event='blog_article_viewed') AS starts,
      minIf(timestamp, event='blog_article_viewed') AS started_at,
      anyIf(properties.required_active_seconds, event='blog_article_viewed') AS required_seconds,
      maxIf(properties.reading_eligible = true AND properties.readable_char_count > 0
        AND properties.required_active_seconds >= 15 AND properties.required_active_seconds <= 90,
        event='blog_article_viewed') AS eligible
    FROM valid_events GROUP BY view_id, session_id, slug, revision
  ), actions AS (
    SELECT v.view_id AS view_id, v.session_id AS session_id, v.slug AS slug, v.revision AS revision,
      max(e.event='blog_read_qualified' AND e.properties.max_body_depth_pct >= 75
        AND e.properties.max_body_depth_pct <= 100
        AND e.properties.active_read_seconds >= e.properties.required_active_seconds
        AND e.properties.required_active_seconds = v.required_seconds
        AND e.properties.required_active_seconds >= 15 AND e.properties.required_active_seconds <= 90) AS qualified,
      max(e.event IN ('blog_read_progress','blog_read_qualified') AND e.properties.max_body_depth_pct >= 75
        AND e.properties.max_body_depth_pct <= 100) AS depth75,
      max(e.event IN ('blog_read_progress','blog_read_qualified') AND e.properties.active_read_seconds >= 30) AS time30,
      max(e.event='blog_feedback_prompt_viewed') AS feedbackPrompts,
      argMaxIf(e.properties.answer, toString(e.properties.feedback_updated_at), e.event='blog_question_feedback') AS answer,
      maxIf(ifNull(toString(e.properties.feedback_updated_at), ''), e.event='blog_question_feedback') AS answer_at,
      max(e.event='blog_post_shared' AND e.properties.surface='article' AND e.properties.method IN ('shared','copied')) AS shares
    FROM views v INNER JOIN valid_events e
      ON v.view_id=e.properties.article_view_id AND v.session_id=e.properties.article_session_id
      AND v.slug=e.properties.blog_slug AND v.revision=e.properties.content_revision
    WHERE v.starts>0 AND e.timestamp>=v.started_at
    GROUP BY v.view_id, v.session_id, v.slug, v.revision
  ), contacts AS (
    SELECT properties.$session_id AS session_id, max(timestamp) AS contacted_at
    FROM events WHERE ${where} AND event IN ${CONTACT_EVENTS}
    GROUP BY session_id
  ), session_posts AS (
    SELECT v.session_id AS session_id, v.slug AS slug, any(v.path) AS path,
      max(v.eligible) AS eligibleVisits, max(v.eligible AND a.qualified) AS qualified,
      max(v.eligible AND a.depth75) AS depth75, max(v.eligible AND a.time30) AS time30,
      max(a.feedbackPrompts) AS feedbackPrompts,
      argMax(a.answer, a.answer_at) = 'solved' AS solved,
      argMax(a.answer, a.answer_at) = 'unresolved' AS unresolved,
      max(a.shares) AS shares,
      max(c.contacted_at>=v.started_at) AS inquiries
    FROM views v LEFT JOIN actions a ON v.view_id=a.view_id AND v.session_id=a.session_id AND v.slug=a.slug AND v.revision=a.revision
    LEFT JOIN contacts c ON v.session_id=c.session_id
    WHERE v.starts>0 GROUP BY v.session_id, v.slug
  )`;
  const sums = COUNT_KEYS.filter(key => key !== "visits").map(key => `sum(${key}) AS ${key}`).join(", ");
  return {
    range,
    summary: `${cte} SELECT count() AS visits, ${sums}, count(DISTINCT slug) AS total_posts FROM session_posts`,
    rows: `${cte} SELECT slug, any(path) AS path, count() AS visits, ${sums} FROM session_posts ${cursor ? `WHERE slug > '${cursor}'` : ""} GROUP BY slug ORDER BY slug ASC LIMIT ${PAGE_SIZE + 1}`,
    quality: `${cte} SELECT
      (SELECT count() FROM raw WHERE (event IN ('blog_article_viewed','blog_read_progress','blog_read_qualified') OR properties.surface='article') AND NOT ifNull((${valid}), false)) AS invalid_events,
      (SELECT count() FROM views WHERE starts=0) AS orphan_views,
      (SELECT sum(if(starts>1,starts-1,0)) FROM views) AS duplicate_starts`,
    first: `SELECT min(timestamp) AS first_at, count() AS starts FROM events WHERE ${HOSTS} AND event='blog_article_viewed' AND ${valid}`,
  };
}

export async function fetchBlogReading(period: ReadingPeriod, cursor: string | null): Promise<ReadingReport> {
  const env = getPostHogEnvStatus();
  const queries = buildReadingQueries(period, cursor);
  const result: ReadingReport = {
    configured: env.projectIdConfigured && env.apiKeyConfigured && env.baseUrlConfigured,
    period, cursor, nextCursor: null, pageSize: PAGE_SIZE, totalPosts: 0,
    meta: { ...queries.range, fetchedAt: new Date().toISOString(), firstObservedAt: null, partial: false },
    warnings: [], summary: counts(), rows: [], quality: null,
  };
  if (!result.configured) return result;
  const [summary, rows, quality, first] = await Promise.allSettled([
    queryPostHog(queries.summary, `blog_read_summary_${period}`),
    queryPostHog(queries.rows, `blog_read_rows_${period}`),
    queryPostHog(queries.quality, `blog_read_quality_${period}`),
    queryPostHog(queries.first, "blog_read_first"),
  ]);
  if (summary.status === "rejected") throw summary.reason;
  result.summary = counts(summary.value[0]);
  result.totalPosts = Number(summary.value[0]?.total_posts ?? 0);
  if (rows.status === "fulfilled") {
    result.rows = rows.value.slice(0, PAGE_SIZE).map(row => ({ ...counts(row), slug: String(row.slug), path: String(row.path) }));
    result.nextCursor = rows.value.length > PAGE_SIZE ? result.rows.at(-1)?.slug ?? null : null;
  }
  else result.warnings.push("글별 데이터를 불러오지 못했습니다.");
  if (quality.status === "fulfilled") {
    const row = quality.value[0];
    result.quality = { invalidEvents: Number(row?.invalid_events ?? 0), orphanViews: Number(row?.orphan_views ?? 0), duplicateStarts: Number(row?.duplicate_starts ?? 0) };
  } else result.warnings.push("수집 품질 데이터를 불러오지 못했습니다.");
  if (first.status === "fulfilled") result.meta.firstObservedAt = Number(first.value[0]?.starts ?? 0) > 0 ? String(first.value[0]?.first_at) : null;
  else result.warnings.push("수집 시작 시각을 확인하지 못했습니다.");
  result.meta.partial = result.warnings.length > 0;
  return result;
}
