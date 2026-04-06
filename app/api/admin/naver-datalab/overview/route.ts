import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../../_lib/cache";
import { fetchNaverDatalabByCategory } from "@/lib/admin-naver-datalab";
import { CATEGORY_KEYWORDS, isRelevantRelatedKeyword } from "@/lib/admin-naver-datalab-keywords";
import { analyzeTrend, analyzeContentGap, generateTopicSuggestions, buildSyntheticCategoryData } from "@/lib/trend-analysis";
import { buildPageUpdateOpportunities, deriveInsightActions, generateFaqSuggestions } from "@/lib/trend-insights";
import { deriveSeasonalityInsights, deriveSegmentInsights } from "@/lib/trend-segment-insights";
import { generateBlogBriefSuggestions, generatePageImprovementBriefs } from "@/lib/trend-briefs";
import type { CategoryTrendData, VolumeDataEntry } from "@/lib/trend-analysis";
import type { KeywordCategorySlug } from "@/lib/admin-naver-datalab-keywords";
import { getAllPublishedPostMetas } from "@/lib/blog-supabase";
import { isSearchAdConfigured, fetchKeywordSearchVolumeWithCache } from "@/lib/admin-naver-searchad";
import type { SearchAdKeywordData } from "@/lib/admin-naver-searchad";

const VALID_PERIODS = ["1m", "3m", "1y", "3y", "10y"];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const mode = request.nextUrl.searchParams.get("mode") ?? "volume";

  // Graceful degradation: env vars not set → full mode needs DataLab, volume mode doesn't
  if (mode === "full" && (!process.env.NAVER_DATALAB_CLIENT_ID || !process.env.NAVER_DATALAB_CLIENT_SECRET)) {
    return Response.json({ data: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const period = request.nextUrl.searchParams.get("period") ?? "3m";
  if (!VALID_PERIODS.includes(period)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (1m, 3m, 1y, 3y, 10y)" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const isFullMode = mode === "full";

    // Fetch DataLab trends (full mode only), published posts, and search volume in parallel
    const [datalabResults, publishedPosts, volumeResult] = await Promise.all([
      // 1) DataLab: all 7 categories with partial failure tolerance (full mode only)
      isFullMode
        ? Promise.allSettled(
            CATEGORY_KEYWORDS.map(async (ck) => {
              const getData = createCachedFetcher(
                `naver-trend-${ck.slug}-${period}`,
                () => fetchNaverDatalabByCategory(ck.subGroups, period),
                CACHE_TTL.NAVER_DATALAB,
              );
              const raw = await getData();
              return { ck, raw };
            }),
          )
        : Promise.resolve(null),
      // 2) Published posts for content gap analysis
      getAllPublishedPostMetas(),
      // 3) Search volume data (검색광고 API) — 24시간 캐시, graceful degradation
      (async (): Promise<{ data: Record<string, VolumeDataEntry>; coverage: number } | { error: string } | undefined> => {
        if (!isSearchAdConfigured()) return { error: "ENV_NOT_SET" };
        try {
          const allKeywords: Array<{ category: KeywordCategorySlug; subGroup: string; keywords: string[] }> = [];
          for (const ck of CATEGORY_KEYWORDS) {
            for (const sg of ck.subGroups) {
              allKeywords.push({
                category: ck.category,
                subGroup: sg.name,
                keywords: sg.volumeKeywords,
              });
            }
          }

          const flatKeywords = [...new Set(allKeywords.flatMap((item) => item.keywords))];

          // Firestore 일별 캐시(L2) 직접 사용 — unstable_cache(L1) 래핑 제거
          // L1이 null을 24h 캐싱하면 전체 fallback되는 문제 방지
          const volumeResults: SearchAdKeywordData[] | null =
            await fetchKeywordSearchVolumeWithCache(flatKeywords);

          if (volumeResults && volumeResults.length > 0) {
            // 요청 키워드 매핑
            const keywordMap = new Map(
              volumeResults
                .filter((v) => !v.isRelated)
                .map((v) => [v.keyword.replace(/\s+/g, "").toLowerCase(), v]),
            );

            // 연관 키워드 수집
            const relatedItems = volumeResults.filter((v) => v.isRelated);

            const data: Record<string, VolumeDataEntry> = {};
            let matched = 0;
            for (const group of allKeywords) {
              const key = `${group.category}:${group.subGroup}`;
              let totalQcCnt = 0;
              let anyEstimated = false;
              let hasData = false;
              const directKws: Array<{ keyword: string; volume: number }> = [];

              for (const kw of group.keywords) {
                const kwData = keywordMap.get(kw.replace(/\s+/g, "").toLowerCase());
                if (kwData) {
                  totalQcCnt += kwData.monthlyTotalQcCnt;
                  if (kwData.isEstimated) anyEstimated = true;
                  hasData = true;
                  directKws.push({ keyword: kw, volume: kwData.monthlyTotalQcCnt });
                }
              }

              // 연관 키워드를 서브그룹에 배정: 서브그룹의 volumeKeywords 중 하나가
              // 연관 키워드(공백 제거)의 부분 문자열이면 해당 서브그룹에 배정
              const normalizedVolumeKws = group.keywords.map((k) =>
                k.replace(/\s+/g, "").toLowerCase(),
              );
              // Map으로 중복 제거 (동일 키워드가 relatedItems에 여러 번 존재할 수 있음)
              const groupRelatedMap = new Map<string, { keyword: string; volume: number }>();
              for (const ri of relatedItems) {
                if (!isRelevantRelatedKeyword(ri.keyword)) continue;
                const normalizedRi = ri.keyword.replace(/\s+/g, "").toLowerCase();
                if (!groupRelatedMap.has(normalizedRi) && normalizedVolumeKws.some((vk) => normalizedRi.includes(vk))) {
                  groupRelatedMap.set(normalizedRi, {
                    keyword: ri.keyword,
                    volume: ri.monthlyTotalQcCnt,
                  });
                }
              }
              const groupRelated = Array.from(groupRelatedMap.values());
              // 검색량 내림차순, 상위 5개
              groupRelated.sort((a, b) => b.volume - a.volume);
              const topRelated = groupRelated.slice(0, 5);

              if (hasData) {
                matched++;
                data[key] = {
                  monthlyTotalQcCnt: totalQcCnt,
                  isEstimated: anyEstimated,
                  relatedKeywords: topRelated,
                  directKeywords: directKws,
                };
              } else if (topRelated.length > 0) {
                // 요청 키워드 매칭 없어도 연관 키워드가 있으면 포함
                matched++;
                data[key] = {
                  monthlyTotalQcCnt: 0,
                  isEstimated: false,
                  relatedKeywords: topRelated,
                  directKeywords: [],
                };
              }
            }
            const coverage = allKeywords.length > 0 ? matched / allKeywords.length : 0;
            return { data, coverage };
          }
          return { error: "EMPTY_RESULTS" };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "UNKNOWN_ERROR" };
        }
      })(),
    ]);

    // Extract volume data (available before categories.map)
    const volumeData = volumeResult && "data" in volumeResult ? volumeResult.data : undefined;
    const volumeCoverage = volumeResult && "coverage" in volumeResult ? volumeResult.coverage : null;

    // Separate fulfilled vs rejected, build categories summary
    let successfulCategoryData: CategoryTrendData[];
    let categories;
    let periodDates: { start: string; end: string } | null = null;

    if (datalabResults) {
      // FULL mode: enrich with DataLab trend analysis
      successfulCategoryData = [];

      categories = datalabResults.map((result, i) => {
        const ck = CATEGORY_KEYWORDS[i];

        if (result.status === "rejected") {
          return {
            category: ck.category,
            slug: ck.slug,
            overallTrend: null,
            changeRate: null,
            topSubGroup: null,
            subGroupCount: null,
            risingCount: null,
            fallingCount: null,
            stableCount: null,
            monthlyTotalVolume: undefined as number | null | undefined,
            error: result.reason instanceof Error ? result.reason.message : "데이터를 불러올 수 없습니다",
          };
        }

        const { raw } = result.value;

        // Enrich sub-groups with trend analysis
        const enrichedSubGroups = raw.groups.map((group) => {
          const { direction, changeRate, currentAvg } = analyzeTrend(group.data);
          return {
            name: group.title,
            trend: direction,
            changeRate,
            currentAvg,
            data: group.data,
          };
        });

        // overallTrend: majority vote among sub-groups; on tie, prefer "stable"
        const risingCount = enrichedSubGroups.filter((sg) => sg.trend === "rising").length;
        const fallingCount = enrichedSubGroups.filter((sg) => sg.trend === "falling").length;
        const stableCount = enrichedSubGroups.filter((sg) => sg.trend === "stable").length;

        let overallTrend: "rising" | "falling" | "stable";
        if (risingCount > fallingCount && risingCount > stableCount) {
          overallTrend = "rising";
        } else if (fallingCount > risingCount && fallingCount > stableCount) {
          overallTrend = "falling";
        } else {
          overallTrend = "stable";
        }

        // changeRate = highest absolute changeRate among sub-groups
        const changeRate = enrichedSubGroups.reduce(
          (max, sg) => (Math.abs(sg.changeRate) > Math.abs(max) ? sg.changeRate : max),
          0,
        );

        // topSubGroup = sub-group with highest currentAvg within the category
        const topSubGroup = enrichedSubGroups.reduce(
          (top, sg) => (sg.currentAvg > top.currentAvg ? sg : top),
          enrichedSubGroups[0],
        );

        // Collect for content gap analysis
        successfulCategoryData.push({
          category: ck.category,
          slug: ck.slug,
          subGroups: enrichedSubGroups,
        });

        // 카테고리 전체 월간 검색량 합산 (검색광고 연동 시)
        let monthlyTotalVolume: number | null = null;
        if (volumeData) {
          let total = 0;
          let hasAny = false;
          for (const esg of enrichedSubGroups) {
            const vol = volumeData[`${ck.category}:${esg.name}`];
            if (vol) {
              total += vol.monthlyTotalQcCnt;
              hasAny = true;
            }
          }
          if (hasAny) monthlyTotalVolume = total;
        }

        return {
          category: ck.category,
          slug: ck.slug,
          overallTrend,
          changeRate,
          topSubGroup: topSubGroup?.name ?? null,
          subGroupCount: enrichedSubGroups.length,
          risingCount,
          fallingCount,
          stableCount,
          monthlyTotalVolume,
          error: null,
        };
      });

      // Use period from first successful result
      const firstSuccess = datalabResults.find((r) => r.status === "fulfilled");
      if (firstSuccess && firstSuccess.status === "fulfilled") {
        periodDates = firstSuccess.value.raw.period;
      }
    } else {
      // VOLUME mode: build categories from keyword taxonomy + search volume only
      successfulCategoryData = buildSyntheticCategoryData(CATEGORY_KEYWORDS);

      categories = CATEGORY_KEYWORDS.map((ck) => {
        let monthlyTotalVolume: number | null = null;
        if (volumeData) {
          let total = 0;
          let hasAny = false;
          for (const sg of ck.subGroups) {
            const vol = volumeData[`${ck.category}:${sg.name}`];
            if (vol) {
              total += vol.monthlyTotalQcCnt;
              hasAny = true;
            }
          }
          if (hasAny) monthlyTotalVolume = total;
        }
        return {
          category: ck.category,
          slug: ck.slug,
          overallTrend: null,
          changeRate: null,
          topSubGroup: null,
          subGroupCount: ck.subGroups.length,
          risingCount: null,
          fallingCount: null,
          stableCount: null,
          monthlyTotalVolume,
          error: null,
        };
      });
    }

    // 카테고리 개요 기본 정렬: 월간 절대 검색량 우선 (미연동 카테고리는 후순위)
    categories.sort((a, b) => {
      const av = a.monthlyTotalVolume;
      const bv = b.monthlyTotalVolume;

      if (av != null && bv != null) return bv - av;
      if (av != null) return -1;
      if (bv != null) return 1;

      const aChange = Math.abs(a.changeRate ?? 0);
      const bChange = Math.abs(b.changeRate ?? 0);
      return bChange - aChange;
    });

    // Run content gap analysis on successful categories
    const contentGap = analyzeContentGap(successfulCategoryData, publishedPosts, CATEGORY_KEYWORDS, volumeData);

    // Generate topic suggestions
    const suggestions = generateTopicSuggestions(contentGap, CATEGORY_KEYWORDS);
    const insightActions = deriveInsightActions(contentGap);
    const faqSuggestions = generateFaqSuggestions(contentGap);
    const pageOpportunities = buildPageUpdateOpportunities(contentGap);
    const blogBriefs = generateBlogBriefSuggestions(contentGap);
    const pageBriefs = generatePageImprovementBriefs(pageOpportunities, faqSuggestions);
    const seasonalityInsights = deriveSeasonalityInsights(successfulCategoryData, period);
    const segmentInsights = isFullMode
      ? await deriveSegmentInsights(CATEGORY_KEYWORDS, successfulCategoryData, period).catch(() => [])
      : [];

    return Response.json(
      {
        data: {
          mode,
          period: periodDates,
          categories,
          contentGap,
          suggestions,
          insightActions,
          faqSuggestions,
          pageOpportunities,
          blogBriefs,
          pageBriefs,
          segmentInsights,
          seasonalityInsights,
          volumeSource: volumeData ? "searchad" : "datalab-fallback",
          volumeCoverage: volumeCoverage,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    Sentry.captureException(e);
    const message = e instanceof Error ? e.message : "트렌드 개요 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
