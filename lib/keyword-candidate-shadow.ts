import type { CategoryKeywords, KeywordCategorySlug } from "./admin-naver-datalab-keywords";
import type {
  EvaluationAction,
  EvaluationPoolItem,
  EvaluationPurpose,
  EvaluationRelevance,
  HumanEvaluationLabel,
} from "./keyword-candidate-evaluation";

export const KEYWORD_SHADOW_ENGINE_VERSION = "keyword-shadow-v1";

export interface ShadowReference {
  id: string;
  keyword: string;
  label: HumanEvaluationLabel;
}

export interface TaxonomyShadowAnchor {
  id: string;
  category: KeywordCategorySlug;
  subgroup: string;
  text: string;
  normalizedKeywords: string[];
}

export interface ShadowTaxonomyCandidate {
  category: KeywordCategorySlug;
  subgroup: string;
  lexicalScore: number;
  semanticScore: number;
  hybridScore: number;
}

export interface KeywordShadowPrediction {
  relevance: EvaluationRelevance;
  relevanceConfidence: number;
  purpose: EvaluationPurpose;
  purposeConfidence: number;
  action: EvaluationAction;
  taxonomyCandidates: ShadowTaxonomyCandidate[];
  nearestExamples: Array<{ id: string; keyword: string; similarity: number }>;
}

export interface ShadowPredictionInput {
  item: EvaluationPoolItem & { id: string };
  references: ShadowReference[];
  itemVector: number[];
  referenceVectors: Map<string, number[]>;
  anchors: TaxonomyShadowAnchor[];
  anchorVectors: Map<string, number[]>;
}

function normalize(keyword: string): string {
  return keyword.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

export function normalizeShadowVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm === 0 ? vector.map(() => 0) : vector.map((value) => value / norm);
}

function normalizedVectorSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function lexicalOverlap(normalized: string, anchors: string[]): number {
  let best = 0;
  for (const anchor of anchors) {
    if (!normalized.includes(anchor) && !anchor.includes(normalized)) continue;
    best = Math.max(best, Math.min(normalized.length, anchor.length) / Math.max(normalized.length, anchor.length));
  }
  return best;
}

function topVote<T extends string>(votes: Map<T, number>, fallback: T): { value: T; confidence: number } {
  const sorted = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = sorted.reduce((sum, entry) => sum + entry[1], 0);
  return { value: sorted[0]?.[0] ?? fallback, confidence: total > 0 ? (sorted[0]?.[1] ?? 0) / total : 0 };
}

function balanceVotes<T extends string>(votes: Map<T, number>, counts: Map<T, number>): void {
  for (const [value, weight] of votes) {
    votes.set(value, weight / Math.max(1, counts.get(value) ?? 1) ** 0.25);
  }
}

const PRECISE_LOCAL_PATTERN =
  /서울|검단|송도|연산동|영통|오산|인천|대구|수원|부천|일산|부산|온천|구월동|구의역|건대|주엽역|청담동|반석동|고촌|한강신도시|장기동|풍무동|구래동|마산동|양촌|걸포동|운양동|사우동|감정동|금천|김포|수성|마곡|수지구청|미금역|양산|강남|분당|아산|나성동|강북구|세종|부평구|울산|에스바른치과|더화이트치과|연세.*치과/;
const PRECISE_PRODUCT_PATTERN =
  /워터픽|아쿠아픽|aquapick|오랄비|필립스|큐라덴|메디메이트|알로코리아|브라운|비타할로|오아|이지숨|치간칫솔|구강세정기|칫솔|치약|캔디|스프레이|세척제|세정제|세척기|살균|세정컵|가글|영양제|유산균|구취측정기|마우스가드|마우스피스|쿠션코렉트|덴텍치실|양치컵|인사돌|aq350|wf10k|구강청결제|셀프치석|셀프스케일링|치석제거|입냄새.*약|구취제거약|시린이약|치주염치료약|오스템|네오임플란트|짐머임플란트|인비절라인퍼스트/i;
const PRECISE_FAQ_PATTERN =
  /이가시린이유|입냄새제거방법|틀니사용법|깨진이빨|턱빠짐|치실냄새|잇몸냄새|입마름증상|인레이판매/;
const PRECISE_CONTENT_PATTERN =
  /후기|안면비대칭교정방법|베이킹소다치아미백|입냄새한의원|임플란트보험추천|치아미백레이저|돌출입투명교정|치과보험청구|치아보험청구|금니판매|돌출입수술|임플란트수면마취/;
const OBVIOUS_NOISE_PATTERN =
  /재활병원|센서|엉치|자율신경|피부과|지르코니아가공|코감기|반찬용기|변호사|노트북|비염|세탁기|^붓$|지방흡입|의료소송|안면윤곽|건망증|호흡기|광대축소|^tid$|이명|어지럽|산화알루미늄|threebond|척추|허리측만|금속보수|세라믹기판|^navigation$|프롤로|계산기|접착|본드|실리콘|폴리비닐|페인트|테프론|수성로라|바인더|락앤락/i;

function precisePurposeSignal(keyword: string): EvaluationPurpose | null {
  if (PRECISE_LOCAL_PATTERN.test(keyword)) return "local";
  if (PRECISE_FAQ_PATTERN.test(keyword)) return "faq";
  if (PRECISE_CONTENT_PATTERN.test(keyword)) return "content";
  if (PRECISE_PRODUCT_PATTERN.test(keyword)) return "product";
  return null;
}

export function buildTaxonomyShadowAnchors(taxonomy: CategoryKeywords[]): TaxonomyShadowAnchor[] {
  return taxonomy.flatMap((category) => category.subGroups.map((subgroup) => ({
    id: `${category.slug}:${subgroup.name}`,
    category: category.slug,
    subgroup: subgroup.name,
    text: `${category.category} > ${subgroup.name}\n검색 의도: ${subgroup.searchIntent}\n대표 검색어: ${subgroup.keywords.join(", ")}`,
    normalizedKeywords: subgroup.keywords.map(normalize),
  })));
}

export function predictKeywordCandidateShadow(input: ShadowPredictionInput): KeywordShadowPrediction {
  const neighbors = input.references
    .flatMap((reference) => {
      const vector = input.referenceVectors.get(reference.id);
      return vector ? [{ reference, similarity: normalizedVectorSimilarity(input.itemVector, vector) }] : [];
    })
    .sort((a, b) => b.similarity - a.similarity || a.reference.keyword.localeCompare(b.reference.keyword))
    .slice(0, 11);

  const relevanceVotes = new Map<EvaluationRelevance, number>();
  const purposeVotes = new Map<EvaluationPurpose, number>();
  const relevanceCounts = new Map<EvaluationRelevance, number>();
  const purposeCounts = new Map<EvaluationPurpose, number>();
  for (const reference of input.references) {
    relevanceCounts.set(reference.label.relevance, (relevanceCounts.get(reference.label.relevance) ?? 0) + 1);
    if (reference.label.relevance === "relevant") {
      purposeCounts.set(reference.label.purpose, (purposeCounts.get(reference.label.purpose) ?? 0) + 1);
    }
  }
  for (const neighbor of neighbors) {
    const weight = Math.max(0.0001, neighbor.similarity ** 8);
    relevanceVotes.set(neighbor.reference.label.relevance, (relevanceVotes.get(neighbor.reference.label.relevance) ?? 0) + weight);
    if (neighbor.reference.label.relevance === "relevant") {
      purposeVotes.set(neighbor.reference.label.purpose, (purposeVotes.get(neighbor.reference.label.purpose) ?? 0) + weight);
    }
  }
  balanceVotes(relevanceVotes, relevanceCounts);
  balanceVotes(purposeVotes, purposeCounts);
  const precisePurpose = precisePurposeSignal(input.item.keyword);
  if (OBVIOUS_NOISE_PATTERN.test(input.item.keyword)) relevanceVotes.set("irrelevant", (relevanceVotes.get("irrelevant") ?? 0) + 1.5);
  else if (!input.item.passesBasicRelevance) relevanceVotes.set("irrelevant", (relevanceVotes.get("irrelevant") ?? 0) + 0.3);
  if (precisePurpose) {
    relevanceVotes.set("relevant", (relevanceVotes.get("relevant") ?? 0) + 0.25);
    purposeVotes.set(precisePurpose, (purposeVotes.get(precisePurpose) ?? 0) + 2);
  }
  if (input.item.productOrBrand) purposeVotes.set("product", (purposeVotes.get("product") ?? 0) + 0.05);
  if (input.item.localOrRegional) purposeVotes.set("local", (purposeVotes.get("local") ?? 0) + 0.05);
  if (!precisePurpose && input.item.lexicalScore >= 0.35) purposeVotes.set("taxonomy", (purposeVotes.get("taxonomy") ?? 0) + 0.35);

  const relevance = topVote(relevanceVotes, "uncertain");
  const purpose = relevance.value === "irrelevant"
    ? { value: "noise" as const, confidence: relevance.confidence }
    : topVote(purposeVotes, "unknown");
  const normalized = normalize(input.item.keyword);
  const taxonomyCandidates = input.anchors
    .flatMap((anchor) => {
      const vector = input.anchorVectors.get(anchor.id);
      if (!vector) return [];
      const lexicalScore = lexicalOverlap(normalized, anchor.normalizedKeywords);
      const semanticScore = normalizedVectorSimilarity(input.itemVector, vector);
      return [{
        category: anchor.category,
        subgroup: anchor.subgroup,
        lexicalScore,
        semanticScore,
        hybridScore: semanticScore * 0.65 + lexicalScore * 0.35,
      }];
    })
    .sort((a, b) => b.hybridScore - a.hybridScore || b.semanticScore - a.semanticScore || a.subgroup.localeCompare(b.subgroup))
    .slice(0, 3);

  let action: EvaluationAction = "approve";
  if (relevance.value === "irrelevant") action = "reject";
  else if (relevance.value === "uncertain" || purpose.value === "unknown") action = "review";
  else if (purpose.value === "taxonomy" && taxonomyCandidates.length === 0) action = "reclassify";
  else if (purpose.value === "taxonomy" && input.item.monthlyVolume < 100) action = "defer";

  return {
    relevance: relevance.value,
    relevanceConfidence: relevance.confidence,
    purpose: purpose.value,
    purposeConfidence: purpose.confidence,
    action,
    taxonomyCandidates,
    nearestExamples: neighbors.slice(0, 5).map((neighbor) => ({
      id: neighbor.reference.id,
      keyword: neighbor.reference.keyword,
      similarity: neighbor.similarity,
    })),
  };
}
