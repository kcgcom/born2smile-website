import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { createCachedFetcher, CACHE_TTL } from "../../_lib/cache";
import { fetchNaverDatalabByCategory } from "@/lib/admin-naver-datalab";
import { CATEGORY_KEYWORDS } from "@/lib/admin-naver-datalab-keywords";
import { analyzeTrend, analyzeContentGap, generateTopicSuggestions } from "@/lib/trend-analysis";
import type { CategoryTrendData, VolumeDataEntry } from "@/lib/trend-analysis";
import { getAllPublishedPostMetas } from "@/lib/blog-firestore";
import { isSearchAdConfigured, fetchKeywordSearchVolumeWithCache } from "@/lib/admin-naver-searchad";

const VALID_PERIODS = ["7d", "28d", "90d"];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  // Graceful degradation: env vars not set → return null (not an error)
  if (!process.env.NAVER_DATALAB_CLIENT_ID || !process.env.NAVER_DATALAB_CLIENT_SECRET) {
    return Response.json({ data: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const period = request.nextUrl.searchParams.get("period") ?? "28d";
  if (!VALID_PERIODS.includes(period)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 기간입니다 (7d, 28d, 90d)" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    // Fetch DataLab trends, published posts, and search volume in parallel
    const [results, publishedPosts, volumeResult] = await Promise.all([
      // 1) DataLab: all 7 categories with partial failure tolerance
      Promise.allSettled(
        CATEGORY_KEYWORDS.map(async (ck) => {
          const getData = createCachedFetcher(
            `naver-trend-${ck.slug}-${period}`,
            () => fetchNaverDatalabByCategory(ck.subGroups, period),
            CACHE_TTL.NAVER_DATALAB,
          );
          const raw = await getData();
          return { ck, raw };
        }),
      ),
      // 2) Published posts for content gap analysis
      getAllPublishedPostMetas(),
      // 3) Search volume data (검색광고 API) — 24시간 캐시, graceful degradation
      (async (): Promise<{ data: Record<string, VolumeDataEntry>; coverage: number } | { error: string } | undefined> => {
        if (!isSearchAdConfigured()) return { error: "ENV_NOT_SET" };
        try {
          const allKeywords: Array<{ category: string; subGroup: string; keywords: string[] }> = [];
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

          // 24시간 캐시 (월간 데이터이므로 빈번한 갱신 불필요, API 레이트 리밋 보호)
          const getCachedVolume = createCachedFetcher(
            "searchad-volume-overview",
            () => fetchKeywordSearchVolumeWithCache(flatKeywords),
            CACHE_TTL.SEARCHAD_VOLUME,
          );
          const volumeResults = await getCachedVolume();

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

              for (const kw of group.keywords) {
                const kwData = keywordMap.get(kw.replace(/\s+/g, "").toLowerCase());
                if (kwData) {
                  totalQcCnt += kwData.monthlyTotalQcCnt;
                  if (kwData.isEstimated) anyEstimated = true;
                  hasData = true;
                }
              }

              // 연관 키워드를 서브그룹에 배정: 서브그룹의 volumeKeywords 중 하나가
              // 연관 키워드(공백 제거)의 부분 문자열이면 해당 서브그룹에 배정
              const normalizedVolumeKws = group.keywords.map((k) =>
                k.replace(/\s+/g, "").toLowerCase(),
              );
              const groupRelated: Array<{ keyword: string; volume: number }> = [];
              for (const ri of relatedItems) {
                const normalizedRi = ri.keyword.replace(/\s+/g, "").toLowerCase();
                if (normalizedVolumeKws.some((vk) => normalizedRi.includes(vk))) {
                  groupRelated.push({
                    keyword: ri.keyword,
                    volume: ri.monthlyTotalQcCnt,
                  });
                }
              }
              // 검색량 내림차순, 상위 5개
              groupRelated.sort((a, b) => b.volume - a.volume);
              const topRelated = groupRelated.slice(0, 5);

              if (hasData) {
                matched++;
                data[key] = {
                  monthlyTotalQcCnt: totalQcCnt,
                  isEstimated: anyEstimated,
                  relatedKeywords: topRelated,
                };
              } else if (topRelated.length > 0) {
                // 요청 키워드 매칭 없어도 연관 키워드가 있으면 포함
                matched++;
                data[key] = {
                  monthlyTotalQcCnt: 0,
                  isEstimated: false,
                  relatedKeywords: topRelated,
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
    const successfulCategoryData: CategoryTrendData[] = [];

    const categories = results.map((result, i) => {
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

    // Run content gap analysis on successful categories
    const contentGap = analyzeContentGap(successfulCategoryData, publishedPosts, CATEGORY_KEYWORDS, volumeData);

    // Generate topic suggestions
    const suggestions = generateTopicSuggestions(contentGap, CATEGORY_KEYWORDS);

    // Use period from first successful result, or calculate from period string
    const firstSuccess = results.find((r) => r.status === "fulfilled");
    const periodDates =
      firstSuccess && firstSuccess.status === "fulfilled"
        ? firstSuccess.value.raw.period
        : null;

    return Response.json(
      {
        data: {
          period: periodDates,
          categories,
          contentGap,
          suggestions,
          volumeSource: volumeData ? "searchad" : "datalab-fallback",
          volumeCoverage: volumeCoverage,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "트렌드 개요 데이터를 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
