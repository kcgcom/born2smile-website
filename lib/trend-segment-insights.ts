import type { KeywordCategorySlug, KeywordSubGroup } from "./admin-naver-datalab-keywords";
import { unstable_cache } from "next/cache";
import { fetchNaverDatalabByCategory } from "./admin-naver-datalab";
import { analyzeTrend, type CategoryTrendData } from "./trend-analysis";

export interface SegmentInsightItem {
  category: KeywordCategorySlug;
  slug: KeywordCategorySlug;
  subGroup: string;
  device: { label: "모바일" | "PC"; momentumScore: number; changeRate: number };
  gender: { label: "여성" | "남성"; momentumScore: number; changeRate: number };
  age: { label: string; momentumScore: number; changeRate: number };
  note: string;
}

export interface SeasonalityInsightItem {
  category: KeywordCategorySlug;
  slug: KeywordCategorySlug;
  peakMonths: string[];
  lowMonths: string[];
  confidence: "high" | "medium" | "low";
  note: string;
}

interface DatalabFilter {
  device?: "pc" | "mo";
  gender?: "m" | "f";
  ages?: string[];
}

const AGE_BANDS: Array<{ label: string; ages: string[] }> = [
  { label: "19~29세", ages: ["3", "4"] },
  { label: "30~39세", ages: ["5", "6"] },
  { label: "40~49세", ages: ["7", "8"] },
  { label: "50세 이상", ages: ["9", "10", "11"] },
];

function scoreMomentum(data: Array<{ period: string; ratio: number }>): { momentumScore: number; changeRate: number } {
  const { changeRate, currentAvg } = analyzeTrend(data);
  const momentumScore = Math.round(currentAvg * 0.55 + Math.max(0, changeRate) * 0.45);
  return { momentumScore, changeRate };
}

async function fetchSingleSubGroupSegment(
  subGroup: KeywordSubGroup,
  period: string,
  filter: DatalabFilter,
): Promise<{ momentumScore: number; changeRate: number }> {
  const filterKey = JSON.stringify(filter);
  const subgroupKey = `${subGroup.name}:${subGroup.keywords.join("|")}`;
  const getSegment = unstable_cache(
    async () => {
      const result = await fetchNaverDatalabByCategory([subGroup], period, filter);
      const data = result.groups[0]?.data ?? [];
      return scoreMomentum(data);
    },
    [`trend-segment:${subgroupKey}:${period}:${filterKey}`],
    { revalidate: 21600 },
  );
  const result = await getSegment();
  return result;
}

export async function deriveSegmentInsights(
  categoryKeywords: Array<{ category: KeywordCategorySlug; slug: KeywordCategorySlug; subGroups: KeywordSubGroup[] }>,
  categoryData: CategoryTrendData[],
  period: string,
): Promise<SegmentInsightItem[]> {
  const prioritized = categoryData
    .map((cat) => ({
      ...cat,
      topSubGroupData: cat.subGroups.slice().sort((a, b) => b.currentAvg - a.currentAvg)[0],
    }))
    .filter((cat) => cat.topSubGroupData)
    .slice(0, 3);

  const insights = await Promise.all(
    prioritized.map(async (cat) => {
      const keywordCategory = categoryKeywords.find((item) => item.category === cat.category);
      const subGroup = keywordCategory?.subGroups.find((item) => item.name === cat.topSubGroupData.name);
      if (!subGroup) return null;

      const [mobile, pc, female, male, ...ageResults] = await Promise.all([
        fetchSingleSubGroupSegment(subGroup, period, { device: "mo" }),
        fetchSingleSubGroupSegment(subGroup, period, { device: "pc" }),
        fetchSingleSubGroupSegment(subGroup, period, { gender: "f" }),
        fetchSingleSubGroupSegment(subGroup, period, { gender: "m" }),
        ...AGE_BANDS.map((band) => fetchSingleSubGroupSegment(subGroup, period, { ages: band.ages })),
      ]);

      const device = mobile.momentumScore >= pc.momentumScore
        ? { label: "모바일" as const, ...mobile }
        : { label: "PC" as const, ...pc };
      const gender = female.momentumScore >= male.momentumScore
        ? { label: "여성" as const, ...female }
        : { label: "남성" as const, ...male };
      const ageWithBand = ageResults.map((result, index) => ({ label: AGE_BANDS[index].label, ...result }));
      const age = ageWithBand.sort((a, b) => b.momentumScore - a.momentumScore)[0];

      return {
        category: cat.category,
        slug: cat.slug,
        subGroup: subGroup.name,
        device,
        gender,
        age,
        note: `필터별 상대 지수 추세 기준으로 ${subGroup.name}는 ${device.label}·${gender.label}·${age.label} 반응이 최근 더 두드러집니다.`,
      } satisfies SegmentInsightItem;
    }),
  );

  return insights.filter((item): item is SegmentInsightItem => item !== null);
}

const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export function deriveSeasonalityInsights(categoryData: CategoryTrendData[], period: string): SeasonalityInsightItem[] {
  if (period !== "3y" && period !== "10y") return [];

  const items = categoryData
    .map((cat) => {
      const monthBuckets = new Map<number, number[]>();
      for (const subGroup of cat.subGroups) {
        for (const point of subGroup.data) {
          const date = new Date(point.period);
          if (Number.isNaN(date.getTime())) continue;
          const month = date.getUTCMonth();
          const list = monthBuckets.get(month) ?? [];
          list.push(point.ratio);
          monthBuckets.set(month, list);
        }
      }

      const monthlyAverages = [...monthBuckets.entries()]
        .map(([month, values]) => ({ month, avg: values.reduce((sum, value) => sum + value, 0) / values.length }))
        .sort((a, b) => b.avg - a.avg);

      if (monthlyAverages.length < 6) return null;

      const spread = monthlyAverages[0].avg - monthlyAverages[monthlyAverages.length - 1].avg;
      const confidence: SeasonalityInsightItem["confidence"] = spread >= 20 ? "high" : spread >= 10 ? "medium" : "low";
      if (confidence === "low") return null;

      return {
        category: cat.category,
        slug: cat.slug,
        peakMonths: monthlyAverages.slice(0, 2).map((item) => MONTH_LABELS[item.month]),
        lowMonths: monthlyAverages.slice(-2).reverse().map((item) => MONTH_LABELS[item.month]),
        confidence,
        note: `${MONTH_LABELS[monthlyAverages[0].month]}~${MONTH_LABELS[monthlyAverages[1].month]}에 상대 관심이 높고 ${MONTH_LABELS[monthlyAverages[monthlyAverages.length - 1].month]}에는 낮아지는 패턴이 보입니다.`,
      } as SeasonalityInsightItem;
    })
    .filter((item): item is SeasonalityInsightItem => item !== null);

  return items.slice(0, 4);
}
