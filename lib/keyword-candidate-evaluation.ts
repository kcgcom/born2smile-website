import crypto from "node:crypto";
import type { KeywordCategorySlug } from "./admin-naver-datalab-keywords";

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

export interface KeywordEvaluationItem extends EvaluationPoolItem {
  id: string;
  stratum: EvaluationStratum;
  autoLabel: AutoEvaluationLabel;
  humanLabel: null;
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
