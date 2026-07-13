import crypto from "node:crypto";
import {
  isRelevantRelatedKeyword,
  type CategoryKeywords,
  type KeywordCategorySlug,
} from "./admin-naver-datalab-keywords";
import type { SearchAdKeywordData } from "./admin-naver-searchad";

export type EvaluationStratum =
  | "current-surface"
  | "cap-hidden"
  | "lexical-low-volume"
  | "lexical-missed"
  | "product-brand"
  | "local-regional"
  | "noise-uncertain";

export interface EvaluationPoolItem {
  keyword: string;
  monthlyVolume: number;
  lexicalCategory: KeywordCategorySlug | null;
  lexicalSubgroup: string | null;
  lexicalScore: number;
  currentSurface: boolean;
  capHidden: boolean;
  passesBasicRelevance: boolean;
  productOrBrand: boolean;
  localOrRegional: boolean;
  alreadyRegistered: boolean;
}

export interface AutoEvaluationLabel {
  relevance: "relevant" | "irrelevant" | "uncertain";
  purpose: "taxonomy" | "content" | "faq" | "product" | "local" | "noise" | "unknown";
  action: "approve" | "defer" | "reject" | "reclassify" | "review";
  confidence: "high" | "medium" | "low";
  reasons: string[];
}

export type EvaluationRelevance = AutoEvaluationLabel["relevance"];
export type EvaluationPurpose = AutoEvaluationLabel["purpose"];
export type EvaluationAction = AutoEvaluationLabel["action"];

export interface HumanEvaluationLabel {
  relevance: EvaluationRelevance;
  purpose: EvaluationPurpose;
  action: EvaluationAction;
  category: KeywordCategorySlug | null;
  subgroup: string | null;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

export interface KeywordEvaluationItem extends EvaluationPoolItem {
  id: string;
  stratum: EvaluationStratum;
  autoLabel: AutoEvaluationLabel;
  humanLabel: HumanEvaluationLabel | null;
}

export const DEFAULT_EVALUATION_QUOTAS: Record<EvaluationStratum, number> = {
  "current-surface": 50,
  "cap-hidden": 50,
  "lexical-low-volume": 40,
  "lexical-missed": 60,
  "product-brand": 35,
  "local-regional": 25,
  "noise-uncertain": 40,
};

const EVALUATION_STRATUM_ORDER: EvaluationStratum[] = [
  "product-brand",
  "local-regional",
  "noise-uncertain",
  "current-surface",
  "cap-hidden",
  "lexical-low-volume",
  "lexical-missed",
];

const PRODUCT_OR_BRAND_PATTERN =
  /추천|셀프|세척|관리|운동|방지|치약|칫솔|칫솔모|세정제|세척기|제거제|사탕|영양제|케이스|오랄비|워터픽|아쿠아픽|오아구강|화이트랩스|오스템|덴티움|스트라우만|crest/i;
const LOCAL_OR_REGIONAL_PATTERN =
  /김포|고촌|한강신도시|장기동|풍무동|구래동|마산동|양촌|걸포동|운양동|사우동|감정동|송도|수성|수지|산본|마곡|연세.*치과/;

function normalize(keyword: string): string {
  return keyword.replace(/\s+/g, "").toLowerCase();
}

export function buildKeywordEvaluationPool(
  taxonomy: CategoryKeywords[],
  snapshot: SearchAdKeywordData[],
): EvaluationPoolItem[] {
  const existing = new Set(taxonomy.flatMap((category) =>
    category.subGroups.flatMap((group) => group.keywords.map(normalize)),
  ));
  const targets = taxonomy.flatMap((category) => category.subGroups.map((group) => ({
    category: category.slug,
    subgroup: group.name,
    keywords: group.keywords.map(normalize),
  })));

  const deduped = new Map<string, EvaluationPoolItem>();
  for (const row of snapshot) {
    if (!row.isRelated || row.monthlyTotalQcCnt <= 0) continue;
    const normalized = normalize(row.keyword);
    let lexicalCategory: KeywordCategorySlug | null = null;
    let lexicalSubgroup: string | null = null;
    let lexicalScore = 0;
    for (const target of targets) {
      for (const core of target.keywords) {
        if (!normalized.includes(core) || normalized === core) continue;
        const score = core.length / normalized.length;
        if (score > lexicalScore) {
          lexicalCategory = target.category;
          lexicalSubgroup = target.subgroup;
          lexicalScore = score;
        }
      }
    }
    const previous = deduped.get(normalized);
    if (previous && previous.monthlyVolume >= row.monthlyTotalQcCnt) continue;
    deduped.set(normalized, {
      keyword: row.keyword,
      monthlyVolume: row.monthlyTotalQcCnt,
      lexicalCategory,
      lexicalSubgroup,
      lexicalScore,
      currentSurface: false,
      capHidden: false,
      passesBasicRelevance: isRelevantRelatedKeyword(row.keyword),
      productOrBrand: PRODUCT_OR_BRAND_PATTERN.test(row.keyword),
      localOrRegional: LOCAL_OR_REGIONAL_PATTERN.test(row.keyword),
      alreadyRegistered: existing.has(normalized),
    });
  }

  const eligible = [...deduped.values()]
    .filter((item) => !item.alreadyRegistered && item.passesBasicRelevance && item.lexicalScore >= 0.35 && item.monthlyVolume >= 100)
    .sort((a, b) => b.monthlyVolume - a.monthlyVolume);
  const subgroupCounts = new Map<string, number>();
  for (const item of eligible) {
    const key = `${item.lexicalCategory}:${item.lexicalSubgroup}`;
    const count = subgroupCounts.get(key) ?? 0;
    item.currentSurface = count < 5;
    item.capHidden = count >= 5;
    subgroupCounts.set(key, count + 1);
  }
  return [...deduped.values()];
}

function stableOrder(keyword: string): string {
  return crypto.createHash("sha1").update(keyword).digest("hex");
}

function matchesStratum(item: EvaluationPoolItem, stratum: EvaluationStratum): boolean {
  if (stratum === "current-surface") return item.currentSurface;
  if (stratum === "cap-hidden") return item.capHidden;
  if (stratum === "lexical-low-volume") return item.lexicalScore >= 0.35 && item.monthlyVolume < 100;
  if (stratum === "lexical-missed") return item.lexicalScore < 0.35 && item.monthlyVolume >= 100;
  if (stratum === "product-brand") return item.productOrBrand;
  if (stratum === "local-regional") return item.localOrRegional;
  return !item.passesBasicRelevance;
}

export function autoLabelEvaluationItem(item: EvaluationPoolItem): AutoEvaluationLabel {
  if (!item.passesBasicRelevance) {
    return { relevance: "irrelevant", purpose: "noise", action: "reject", confidence: "medium", reasons: ["기본 치과·지역 관련성 규칙을 통과하지 못함"] };
  }
  if (item.productOrBrand) {
    return { relevance: "relevant", purpose: "product", action: "defer", confidence: "medium", reasons: ["제품·브랜드 탐색 신호"] };
  }
  if (item.localOrRegional) {
    return { relevance: "uncertain", purpose: "local", action: "review", confidence: "low", reasons: ["지역·병원 탐색 신호"] };
  }
  if (item.lexicalCategory == null || item.lexicalSubgroup == null) {
    return { relevance: "uncertain", purpose: "unknown", action: "reclassify", confidence: "low", reasons: ["문자열 기반 서브그룹 매칭 없음"] };
  }
  if (item.monthlyVolume >= 100 && item.lexicalScore >= 0.35) {
    return { relevance: "relevant", purpose: "taxonomy", action: "approve", confidence: "medium", reasons: ["문자열 관련성과 최소 검색량 충족"] };
  }
  return { relevance: "uncertain", purpose: "content", action: "review", confidence: "low", reasons: ["관련 가능성은 있으나 핵심어 근거가 부족함"] };
}

export function buildKeywordEvaluationSample(
  pool: EvaluationPoolItem[],
  quotas: Record<EvaluationStratum, number> = DEFAULT_EVALUATION_QUOTAS,
): KeywordEvaluationItem[] {
  const selected = new Set<string>();
  const result: KeywordEvaluationItem[] = [];
  for (const stratum of EVALUATION_STRATUM_ORDER) {
    const quota = quotas[stratum];
    const candidates = pool
      .filter((item) => !item.alreadyRegistered && !selected.has(item.keyword) && matchesStratum(item, stratum))
      .sort((a, b) => stableOrder(a.keyword).localeCompare(stableOrder(b.keyword)))
      .slice(0, quota);
    for (const item of candidates) {
      selected.add(item.keyword);
      result.push({
        ...item,
        id: stableOrder(item.keyword),
        stratum,
        autoLabel: autoLabelEvaluationItem(item),
        humanLabel: null,
      });
    }
  }
  return result;
}
