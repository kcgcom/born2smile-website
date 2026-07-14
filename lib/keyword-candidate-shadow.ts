import type { CategoryKeywords, KeywordCategorySlug } from "./admin-naver-datalab-keywords";
import type {
  EvaluationAction,
  EvaluationPoolItem,
  EvaluationPurpose,
  EvaluationRelevance,
  HumanEvaluationLabel,
} from "./keyword-candidate-evaluation";

export const KEYWORD_SHADOW_ENGINE_VERSION = "keyword-shadow-v5";

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
  supervisedScore?: number;
  intentScore?: number;
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

export function mergeKeywordShadowReferences(
  preferred: ShadowReference[],
  fallback: ShadowReference[],
): ShadowReference[] {
  const merged = new Map<string, ShadowReference>();
  for (const reference of [...preferred, ...fallback]) {
    const key = normalize(reference.keyword);
    if (!merged.has(key)) merged.set(key, reference);
  }
  return [...merged.values()];
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
  /서울|검단|송도|연산동|영통|오산|인천|대구|수원|부천|일산|부산|온천|구월동|구의역|건대|주엽역|청담동|반석동|고촌|한강신도시|장기동|풍무동|구래동|마산동|양촌|걸포동|운양동|사우동|감정동|금천|김포|수성|마곡|수지구청|미금역|양산|강남|분당|아산|나성동|강북구|세종|부평구|울산|에스바른치과|더화이트치과|연세.*치과|^(치아)?교정치과$|^구강내과(전문의)?$/;
const PRECISE_PRODUCT_PATTERN =
  /워터픽|아쿠아픽|aquapick|오랄비|필립스|큐라덴|메디메이트|알로코리아|브라운|비타할로|오아|이지숨|치간칫솔|구강세정기|구강스펀지|인공타액|혀클리너|구강테이프|구강오일|잇몸물청소|칫솔|치약|캔디|스프레이|세척제|세정제|세척기|살균|세정컵|가글|영양제|유산균|구취측정기|마우스가드|마우스피스|쿠션코렉트|덴텍치실|양치컵|인사돌|aq350|wf10k|구강청결제|셀프치석|셀프스케일링|치석제거|입냄새.*약|구취제거약|시린이약|치주염치료약|오스템|네오임플란트|짐머임플란트|인비절라인퍼스트/i;
const PRECISE_FAQ_PATTERN =
  /이가시린이유|입냄새제거방법|틀니사용법|깨진이빨|턱빠짐|치실냄새|잇몸냄새|입마름증상|인레이판매|^(한쪽턱관절|턱통증|속냄새)$/;
const PRECISE_CONTENT_PATTERN =
  /후기|안면비대칭교정방법|베이킹소다치아미백|한의원|임플란트보험추천|치아미백레이저|돌출입투명교정|치과보험청구|치아보험청구|금니판매|^금이빨가격$|돌출입수술|임플란트수면마취|^턱관절치료운동$|^치과치료(종류)?$/;
const PRECISE_TAXONOMY_PATTERN = /^(잇몸|잇몸염증(치료)?|잇몸(수술|병)|구강건조(증)?(치료)?|입안건조증|구강관리|구강검진치과|입안세균|구강세균|구강질환|구강전정(술|형성술)|치주질환|치주포켓|이시림)$/;
const OBVIOUS_NOISE_PATTERN =
  /재활병원|센서|엉치|자율신경|피부과|지르코니아가공|코감기|반찬용기|변호사|노트북|비염|세탁기|^붓$|지방흡입|의료소송|안면윤곽|눈매교정|쌍꺼풀|건망증|호흡기|광대축소|^tid$|이명|어지럽|산화알루미늄|threebond|척추|허리측만|금속보수|세라믹기판|^navigation$|프롤로|계산기|접착|본드|실리콘|폴리비닐|페인트|테프론|수성로라|바인더|락앤락|^(도요다|토요다|toyota)크라운$/i;
const REVIEW_DENTAL_EVIDENCE_PATTERN =
  /치과|치아|이빨|잇몸|구강|입안|입냄새|속냄새|입벌리고|혀|혓바닥|구내염|설염|턱관절|교정|부정교합|돌출입|양악|안면비대칭|얼굴비대칭|입술비대칭|턱끝|라미네이트|레진|크라운|임플란트|스케일|스켈링|치약|칫솔|치실|구강청결|구강스프레이|불소|인사돌|금니|파절|시림|뻐드렁니|브릿지|틀니|충치|신경치료/i;
const REVIEW_NEGATIVE_DOMAIN_PATTERN =
  /경락|거북목|도수치료|체외충격파|일회용수세미|해외여행준비물|프로바이오틱스유산균|소화가안되는이유|목이물감|편도암|후두암|언청이|안면마비|윤곽수술|귀족수술|생명보험/i;
const REVIEW_AMBIGUOUS_PATTERN = /^침$|침냄새/;
const PREDICTION_AMBIGUOUS_PATTERN = /^(침|crown|구강|잇몸튼튼)$/i;

function precisePurposeSignal(keyword: string): EvaluationPurpose | null {
  if (PRECISE_LOCAL_PATTERN.test(keyword)) return "local";
  if (PRECISE_FAQ_PATTERN.test(keyword)) return "faq";
  if (PRECISE_CONTENT_PATTERN.test(keyword)) return "content";
  if (PRECISE_PRODUCT_PATTERN.test(keyword)) return "product";
  if (PRECISE_TAXONOMY_PATTERN.test(keyword)) return "taxonomy";
  return null;
}

function taxonomyIntentScore(
  normalizedKeyword: string,
  category: KeywordCategorySlug,
  subgroup: string,
): number {
  if (category === "orthodontics") {
    const specificMethod = /부분교정|클리피씨|투명교정|설측교정|인비절라인/.test(normalizedKeyword);
    const ageIntent = /성인|중년|노년|\d{2}대/.test(normalizedKeyword);
    const costIntent = /비용|가격|기간|얼마/.test(normalizedKeyword);
    const malocclusionConcern = /부정교합|과개교합|개방교합|반대교합|교차교합/.test(normalizedKeyword)
      && !/교정기|교정장치/.test(normalizedKeyword);
    if (subgroup === "비용/기간" && /교정/.test(normalizedKeyword) && costIntent && !specificMethod) return 1;
    if (subgroup === "대상/나이" && /교정/.test(normalizedKeyword) && ageIntent) return 1;
    if (subgroup === "심미/고민" && !costIntent && (/비대칭|벌어짐|돌출입|덧니|뻐드렁|주걱턱/.test(normalizedKeyword) || malocclusionConcern)) return 1;
    if (subgroup === "종류/방법" && specificMethod) return 1;
    if (subgroup === "종류/방법" && /교정/.test(normalizedKeyword)
      && !ageIntent
      && !/비용|가격|기간|통증|부작용|나이|유지|재교정|비대칭|벌어짐|돌출입|부정교합|과개교합|개방교합|반대교합|교차교합/.test(normalizedKeyword)) return 0.8;
  }
  if (category === "pediatric" && subgroup === "교정시기" && /소아교정/.test(normalizedKeyword)) return 1;
  if (category === "dental-choice" && subgroup === "신뢰/후기/선택" && /추천|후기|잘하는/.test(normalizedKeyword)) return 1;
  if (category === "implant" && subgroup === "첨단/디지털" && /네비게이션|디지털/.test(normalizedKeyword)) return 1;
  if (category === "implant" && subgroup === "뼈이식/골증대" && /뼈이식|골이식|상악동거상/.test(normalizedKeyword)) return 1;
  if (category === "prevention" && subgroup === "잇몸질환/치료"
    && /잇몸/.test(normalizedKeyword) && !/임플란트|뼈이식|골이식/.test(normalizedKeyword)) return 1;
  if (category === "prevention" && subgroup === "구강위생" && /구강관리|입안세균/.test(normalizedKeyword)) return 1;
  if (category === "general-care" && subgroup === "턱관절/이갈이" && /턱관절/.test(normalizedKeyword)) return 1;
  if (category === "restorative" && subgroup === "레진" && /레진/.test(normalizedKeyword)) return 1;
  if (category === "restorative" && subgroup === "신경치료" && /신경치료/.test(normalizedKeyword)) return 1;
  if (category === "restorative" && subgroup === "시림/균열" && /시림|시린/.test(normalizedKeyword)) return 1;
  if (category === "prosthetics" && subgroup === "소재/종류" && /지르코니아|세라믹|골드크라운/.test(normalizedKeyword)) return 1;
  if (category === "prosthetics" && subgroup === "크라운" && /크라운/.test(normalizedKeyword) && !/지르코니아|세라믹|골드크라운/.test(normalizedKeyword)) return 1;
  if (category === "prosthetics" && subgroup === "라미네이트" && /라미네이트/.test(normalizedKeyword)) return 1;
  return 0;
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
  const sortedNeighbors = input.references
    .flatMap((reference) => {
      const vector = input.referenceVectors.get(reference.id);
      return vector ? [{ reference, similarity: normalizedVectorSimilarity(input.itemVector, vector) }] : [];
    })
    .sort((a, b) => b.similarity - a.similarity || a.reference.keyword.localeCompare(b.reference.keyword));
  const neighbors = sortedNeighbors.slice(0, 11);

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
  const obviousNoise = OBVIOUS_NOISE_PATTERN.test(input.item.keyword);
  if (obviousNoise) relevanceVotes.set("irrelevant", (relevanceVotes.get("irrelevant") ?? 0) + 1.5);
  else if (!input.item.passesBasicRelevance) relevanceVotes.set("irrelevant", (relevanceVotes.get("irrelevant") ?? 0) + 0.3);
  if (precisePurpose) {
    relevanceVotes.set("relevant", (relevanceVotes.get("relevant") ?? 0) + 0.25);
    purposeVotes.set(precisePurpose, (purposeVotes.get(precisePurpose) ?? 0) + 2);
  }
  if (input.item.productOrBrand) purposeVotes.set("product", (purposeVotes.get("product") ?? 0) + 0.05);
  if (input.item.localOrRegional) purposeVotes.set("local", (purposeVotes.get("local") ?? 0) + 0.05);
  if (!precisePurpose && input.item.lexicalScore >= 0.35) purposeVotes.set("taxonomy", (purposeVotes.get("taxonomy") ?? 0) + 0.35);

  const votedRelevance = topVote(relevanceVotes, "uncertain");
  const relevance = obviousNoise
    ? { value: "irrelevant" as const, confidence: 1 }
    : PREDICTION_AMBIGUOUS_PATTERN.test(normalize(input.item.keyword))
      ? { value: "uncertain" as const, confidence: 1 }
      : votedRelevance;
  const purpose = relevance.value === "irrelevant"
    ? { value: "noise" as const, confidence: relevance.confidence }
    : relevance.value === "uncertain"
      ? { value: "unknown" as const, confidence: relevance.confidence }
      : topVote(purposeVotes, "unknown");
  const normalized = normalize(input.item.keyword);
  const placementCounts = new Map<string, number>();
  for (const reference of input.references) {
    const { label } = reference;
    if (label.purpose !== "taxonomy" || !label.category || !label.subgroup) continue;
    const key = `${label.category}:${label.subgroup}`;
    placementCounts.set(key, (placementCounts.get(key) ?? 0) + 1);
  }
  const placementVotes = new Map<string, number>();
  for (const neighbor of sortedNeighbors.filter(({ reference }) =>
    reference.label.purpose === "taxonomy"
    && reference.label.category
    && reference.label.subgroup,
  ).slice(0, 21)) {
    const { category, subgroup } = neighbor.reference.label;
    const key = `${category}:${subgroup}`;
    const weight = Math.max(0.0001, neighbor.similarity ** 10);
    placementVotes.set(key, (placementVotes.get(key) ?? 0) + weight);
  }
  for (const [key, weight] of placementVotes) {
    placementVotes.set(key, weight / Math.max(1, placementCounts.get(key) ?? 1) ** 0.25);
  }
  const maxPlacementVote = Math.max(0, ...placementVotes.values());
  const taxonomyCandidates = input.anchors
    .flatMap((anchor) => {
      const vector = input.anchorVectors.get(anchor.id);
      if (!vector) return [];
      const lexicalScore = lexicalOverlap(normalized, anchor.normalizedKeywords);
      const semanticScore = normalizedVectorSimilarity(input.itemVector, vector);
      const placementVote = placementVotes.get(`${anchor.category}:${anchor.subgroup}`) ?? 0;
      const supervisedScore = maxPlacementVote > 0 ? placementVote / maxPlacementVote : 0;
      const intentScore = taxonomyIntentScore(normalized, anchor.category, anchor.subgroup);
      return [{
        category: anchor.category,
        subgroup: anchor.subgroup,
        lexicalScore,
        semanticScore,
        supervisedScore,
        intentScore,
        hybridScore: semanticScore * 0.4 + lexicalScore * 0.25 + supervisedScore * 0.15 + intentScore * 0.2,
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

export function isKeywordShadowReviewEligible(
  keyword: string,
  prediction: Pick<KeywordShadowPrediction, "relevance" | "action" | "taxonomyCandidates" | "relevanceConfidence">,
): boolean {
  if (prediction.relevance !== "relevant" || prediction.action === "reject") return false;
  if (REVIEW_NEGATIVE_DOMAIN_PATTERN.test(keyword) || REVIEW_AMBIGUOUS_PATTERN.test(keyword)) return false;
  if (REVIEW_DENTAL_EVIDENCE_PATTERN.test(keyword)) return true;
  const semanticScore = prediction.taxonomyCandidates[0]?.semanticScore ?? 0;
  return semanticScore >= 0.74 && prediction.relevanceConfidence >= 0.8;
}
