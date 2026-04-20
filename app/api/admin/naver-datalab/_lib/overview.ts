import { createCachedFetcher, CACHE_TTL } from "../../_lib/cache";
import { fetchNaverDatalabByCategory } from "@/lib/admin-naver-datalab";
import { CATEGORY_KEYWORDS, isRelevantRelatedKeyword, type KeywordCategorySlug } from "@/lib/admin-naver-datalab-keywords";
import { analyzeTrend, analyzeContentGap, buildSyntheticCategoryData, type CategoryTrendData, type VolumeDataEntry } from "@/lib/trend-analysis";
import { getAllPublishedPostMetas } from "@/lib/blog-supabase";
import { isSearchAdConfigured, fetchKeywordSearchVolumeWithCache, type SearchAdKeywordData } from "@/lib/admin-naver-searchad";

export const VALID_PERIODS = ["1m", "3m", "1y", "3y", "10y"] as const;

export type TrendOverviewMode = "volume" | "full";

export interface TrendOverviewCategory {
  category: KeywordCategorySlug;
  slug: KeywordCategorySlug;
  overallTrend: "rising" | "falling" | "stable" | null;
  changeRate: number | null;
  topSubGroup: string | null;
  subGroupCount: number | null;
  risingCount: number | null;
  fallingCount: number | null;
  stableCount: number | null;
  monthlyTotalVolume: number | null | undefined;
  error: string | null;
}

export interface TrendOverviewBaseData {
  mode: TrendOverviewMode;
  period: { start: string; end: string } | null;
  categories: TrendOverviewCategory[];
  successfulCategoryData: CategoryTrendData[];
  volumeData: Record<string, VolumeDataEntry> | undefined;
  volumeSource: "searchad" | "datalab-fallback";
  volumeCoverage: number | null;
}

export interface TrendOverviewWithGapData extends TrendOverviewBaseData {
  contentGap: ReturnType<typeof analyzeContentGap>;
}

async function mapSettledWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      try {
        results[currentIndex] = {
          status: "fulfilled",
          value: await worker(items[currentIndex], currentIndex),
        };
      } catch (error) {
        results[currentIndex] = {
          status: "rejected",
          reason: error,
        };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run()),
  );

  return results;
}

async function fetchVolumeOverviewData(): Promise<{ data: Record<string, VolumeDataEntry>; coverage: number } | { error: string } | undefined> {
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
    const volumeResults: SearchAdKeywordData[] | null = await fetchKeywordSearchVolumeWithCache(flatKeywords);

    if (!volumeResults || volumeResults.length === 0) {
      return { error: "EMPTY_RESULTS" };
    }

    const keywordMap = new Map(
      volumeResults
        .filter((value) => !value.isRelated)
        .map((value) => [value.keyword.replace(/\s+/g, "").toLowerCase(), value]),
    );
    const relatedItems = volumeResults.filter((value) => value.isRelated);

    const data: Record<string, VolumeDataEntry> = {};
    let matched = 0;

    for (const group of allKeywords) {
      const key = `${group.category}:${group.subGroup}`;
      let totalQcCnt = 0;
      let anyEstimated = false;
      let hasData = false;
      const directKws: Array<{ keyword: string; volume: number }> = [];

      for (const keyword of group.keywords) {
        const keywordData = keywordMap.get(keyword.replace(/\s+/g, "").toLowerCase());
        if (!keywordData) continue;
        totalQcCnt += keywordData.monthlyTotalQcCnt;
        if (keywordData.isEstimated) anyEstimated = true;
        hasData = true;
        directKws.push({ keyword, volume: keywordData.monthlyTotalQcCnt });
      }

      const normalizedVolumeKws = group.keywords.map((keyword) =>
        keyword.replace(/\s+/g, "").toLowerCase(),
      );
      const groupRelatedMap = new Map<string, { keyword: string; volume: number }>();

      for (const related of relatedItems) {
        if (!isRelevantRelatedKeyword(related.keyword)) continue;
        const normalized = related.keyword.replace(/\s+/g, "").toLowerCase();
        if (!groupRelatedMap.has(normalized) && normalizedVolumeKws.some((volumeKeyword) => normalized.includes(volumeKeyword))) {
          groupRelatedMap.set(normalized, {
            keyword: related.keyword,
            volume: related.monthlyTotalQcCnt,
          });
        }
      }

      const topRelated = Array.from(groupRelatedMap.values())
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

      if (hasData) {
        matched++;
        data[key] = {
          monthlyTotalQcCnt: totalQcCnt,
          isEstimated: anyEstimated,
          relatedKeywords: topRelated,
          directKeywords: directKws,
        };
        continue;
      }

      if (topRelated.length > 0) {
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
  } catch (error) {
    return { error: error instanceof Error ? error.message : "UNKNOWN_ERROR" };
  }
}

export async function getTrendOverviewBaseData(period: string, mode: TrendOverviewMode): Promise<TrendOverviewBaseData> {
  const isFullMode = mode === "full";

  const [datalabResults, volumeResult] = await Promise.all([
    isFullMode
      ? mapSettledWithConcurrencyLimit(CATEGORY_KEYWORDS, 2, async (ck) => {
          const getData = createCachedFetcher(
            `naver-trend-${ck.slug}-${period}`,
            () => fetchNaverDatalabByCategory(ck.subGroups, period),
            CACHE_TTL.NAVER_DATALAB,
          );
          const raw = await getData();
          return { ck, raw };
        })
      : Promise.resolve(null),
    fetchVolumeOverviewData(),
  ]);

  const volumeData = volumeResult && "data" in volumeResult ? volumeResult.data : undefined;
  const volumeCoverage = volumeResult && "coverage" in volumeResult ? volumeResult.coverage : null;

  let successfulCategoryData: CategoryTrendData[];
  let categories: TrendOverviewCategory[];
  let periodDates: { start: string; end: string } | null = null;

  if (datalabResults) {
    successfulCategoryData = [];

    categories = datalabResults.map((result, index) => {
      const ck = CATEGORY_KEYWORDS[index];

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
          monthlyTotalVolume: undefined,
          error: result.reason instanceof Error ? result.reason.message : "데이터를 불러올 수 없습니다",
        };
      }

      const enrichedSubGroups = result.value.raw.groups.map((group) => {
        const { direction, changeRate, currentAvg } = analyzeTrend(group.data);
        return {
          name: group.title,
          trend: direction,
          changeRate,
          currentAvg,
          data: group.data,
        };
      });

      const risingCount = enrichedSubGroups.filter((sg) => sg.trend === "rising").length;
      const fallingCount = enrichedSubGroups.filter((sg) => sg.trend === "falling").length;
      const stableCount = enrichedSubGroups.filter((sg) => sg.trend === "stable").length;

      const overallTrend =
        risingCount > fallingCount && risingCount > stableCount
          ? "rising"
          : fallingCount > risingCount && fallingCount > stableCount
            ? "falling"
            : "stable";

      const changeRate = enrichedSubGroups.reduce(
        (max, sg) => (Math.abs(sg.changeRate) > Math.abs(max) ? sg.changeRate : max),
        0,
      );
      const topSubGroup = enrichedSubGroups.reduce(
        (top, sg) => (sg.currentAvg > top.currentAvg ? sg : top),
        enrichedSubGroups[0],
      );

      successfulCategoryData.push({
        category: ck.category,
        slug: ck.slug,
        subGroups: enrichedSubGroups,
      });

      let monthlyTotalVolume: number | null = null;
      if (volumeData) {
        let total = 0;
        let hasAny = false;
        for (const sg of enrichedSubGroups) {
          const volume = volumeData[`${ck.category}:${sg.name}`];
          if (!volume) continue;
          total += volume.monthlyTotalQcCnt;
          hasAny = true;
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

    const firstSuccess = datalabResults.find((result) => result.status === "fulfilled");
    if (firstSuccess && firstSuccess.status === "fulfilled") {
      periodDates = firstSuccess.value.raw.period;
    }
  } else {
    successfulCategoryData = buildSyntheticCategoryData(CATEGORY_KEYWORDS);

    categories = CATEGORY_KEYWORDS.map((ck) => {
      let monthlyTotalVolume: number | null = null;
      if (volumeData) {
        let total = 0;
        let hasAny = false;
        for (const sg of ck.subGroups) {
          const volume = volumeData[`${ck.category}:${sg.name}`];
          if (!volume) continue;
          total += volume.monthlyTotalQcCnt;
          hasAny = true;
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

  categories.sort((a, b) => {
    const av = a.monthlyTotalVolume;
    const bv = b.monthlyTotalVolume;

    if (av != null && bv != null) return bv - av;
    if (av != null) return -1;
    if (bv != null) return 1;

    return Math.abs(b.changeRate ?? 0) - Math.abs(a.changeRate ?? 0);
  });

  return {
    mode,
    period: periodDates,
    categories,
    successfulCategoryData,
    volumeData,
    volumeSource: volumeData ? "searchad" : "datalab-fallback",
    volumeCoverage,
  };
}

export async function getTrendOverviewWithGapData(period: string, mode: TrendOverviewMode): Promise<TrendOverviewWithGapData> {
  const [baseData, publishedPosts] = await Promise.all([
    getTrendOverviewBaseData(period, mode),
    getAllPublishedPostMetas(),
  ]);

  const contentGap = analyzeContentGap(
    baseData.successfulCategoryData,
    publishedPosts,
    CATEGORY_KEYWORDS,
    baseData.volumeData,
  );

  return {
    ...baseData,
    contentGap,
  };
}
