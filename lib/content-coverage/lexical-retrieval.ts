import { CATEGORY_KEYWORDS } from "../admin-naver-datalab-keywords";
import type { ContentDocument, CoverageTopicSpec, EvidenceUnit } from "./types";

const STOP_WORDS = new Set([
  "치과", "치료", "관련", "대한", "위한", "방법", "내용", "설명", "설명한다", "필요", "경우", "기준", "정보", "환자", "일반", "주요", "확인",
]);

export interface LexicalEvidenceCandidate {
  topicSpecId: string;
  documentId: string;
  evidenceUnitId: string;
  title: string;
  path: string | null;
  surface: string | null;
  role: EvidenceUnit["role"];
  score: number;
  exactPhraseMatches: string[];
  topicTokenMatches: string[];
  criterionMatches: Array<{ conceptId: string; criterionId: string; tokens: string[] }>;
  excerpt: string;
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function tokens(value: string): string[] {
  const normalizeToken = (token: string) => {
    const suffixes = ["으로", "에서", "까지", "부터", "에게", "처럼", "보다", "하고", "하며", "하면", "한다", "되는", "대한", "위한", "과", "와", "은", "는", "이", "가", "을", "를", "에", "의", "도", "만", "중", "후", "전"];
    const suffix = suffixes.find((candidate) => token.length > candidate.length + 1 && token.endsWith(candidate));
    return suffix ? token.slice(0, -suffix.length) : token;
  };
  return [...new Set((value
    .normalize("NFKC")
    .toLowerCase()
    .match(/[가-힣a-z0-9]+/g) ?? [])
    .map(normalizeToken))]
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function topicKeywords(spec: CoverageTopicSpec): string[] {
  const separator = spec.searchTopicKey.indexOf(":");
  const category = spec.searchTopicKey.slice(0, separator);
  const subGroup = spec.searchTopicKey.slice(separator + 1);
  const definition = CATEGORY_KEYWORDS
    .find((item) => item.slug === category)
    ?.subGroups.find((item) => item.name === subGroup);
  return [...new Set([spec.label, ...(definition?.keywords ?? [])])];
}

function excerpt(text: string, matchedValues: string[]): string {
  const compactText = normalize(text);
  const firstMatch = matchedValues
    .map((value) => compactText.indexOf(normalize(value)))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, firstMatch - 60);
  const plain = text.replace(/\s+/g, " ").trim();
  return plain.slice(start, start + 220);
}

export function retrieveLexicalEvidence(
  spec: CoverageTopicSpec,
  documents: ContentDocument[],
  limit = 10,
): LexicalEvidenceCandidate[] {
  const phrases = topicKeywords(spec);
  const topicTokenPool = [...new Set(tokens(`${spec.label} ${phrases.join(" ")}`))];
  const category = spec.searchTopicKey.slice(0, spec.searchTopicKey.indexOf(":"));
  const candidates: LexicalEvidenceCandidate[] = [];

  for (const document of documents) {
    for (const evidence of document.units) {
      if (evidence.role !== "primary" && evidence.role !== "supporting") continue;
      if (!evidence.placements.some((placement) => placement.visible && placement.indexable)) continue;
      const normalizedText = normalize(evidence.text);
      const textTokens = new Set(tokens(evidence.text));
      const exactPhraseMatches = phrases.filter((phrase) => normalize(phrase).length >= 2 && normalizedText.includes(normalize(phrase)));
      const topicTokenMatches = topicTokenPool.filter((token) => textTokens.has(token));
      const criterionMatches = spec.concepts.flatMap((concept) => concept.criteria.flatMap((criterion) => {
        const criterionTokens = tokens(`${concept.label} ${criterion.label} ${criterion.description}`);
        const matched = criterionTokens.filter((token) => textTokens.has(token));
        const minimumMatches = Math.max(1, Math.ceil(criterionTokens.length * 0.35));
        return matched.length >= minimumMatches ? [{ conceptId: concept.id, criterionId: criterion.id, tokens: matched }] : [];
      }));
      const hasExactTopic = exactPhraseMatches.length > 0;
      const sameCategory = document.category === category;
      if (!hasExactTopic && (!sameCategory || topicTokenMatches.length < 2 || criterionMatches.length === 0)) continue;

      const exactScore = hasExactTopic
        ? Math.min(60, 45 + Math.min(10, Math.max(...exactPhraseMatches.map((phrase) => normalize(phrase).length))) + Math.min(5, exactPhraseMatches.length - 1))
        : 0;
      const topicScore = Math.min(25, topicTokenMatches.length * 5);
      const criterionScore = Math.min(15, criterionMatches.length * 3);
      const categoryScore = sameCategory ? 10 : 0;
      const roleScore = evidence.role === "primary" ? 5 : 2;
      const score = Math.min(100, exactScore + topicScore + criterionScore + categoryScore + roleScore);
      const placement = evidence.placements.find((item) => item.visible && item.indexable) ?? null;
      candidates.push({
        topicSpecId: spec.id,
        documentId: document.id,
        evidenceUnitId: evidence.id,
        title: document.title,
        path: placement?.path ?? null,
        surface: placement?.surface ?? null,
        role: evidence.role,
        score,
        exactPhraseMatches,
        topicTokenMatches,
        criterionMatches,
        excerpt: excerpt(evidence.text, [...exactPhraseMatches, ...topicTokenMatches]),
      });
    }
  }

  const sorted = candidates
    .sort((a, b) => b.score - a.score
      || b.exactPhraseMatches.length - a.exactPhraseMatches.length
      || a.documentId.localeCompare(b.documentId)
      || a.evidenceUnitId.localeCompare(b.evidenceUnitId));
  const perDocument = new Map<string, number>();
  const selected: LexicalEvidenceCandidate[] = [];
  for (const candidate of sorted) {
    const count = perDocument.get(candidate.documentId) ?? 0;
    if (count >= 2) continue;
    selected.push(candidate);
    perDocument.set(candidate.documentId, count + 1);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function buildLexicalBaseline(
  specs: CoverageTopicSpec[],
  documents: ContentDocument[],
  limit = 10,
): Record<string, LexicalEvidenceCandidate[]> {
  return Object.fromEntries(specs.map((spec) => [spec.id, retrieveLexicalEvidence(spec, documents, limit)]));
}
