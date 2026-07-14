import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cosineSimilarity,
  embedGeminiTexts,
  formatEmbeddingSearchDocument,
  formatEmbeddingSearchQuery,
  GEMINI_EMBEDDING_DIMS,
  GEMINI_EMBEDDING_MODEL,
  isValidGeminiEmbedding,
} from "../gemini-embeddings";
import type { ContentDocument, CoverageTopicSpec, EvidenceUnit } from "./types";

const RETRIEVAL_FORMAT_VERSION = "search-result-v1";
const DEFAULT_CACHE_PATH = path.resolve(process.cwd(), ".tmp/content-coverage-embedding-cache.json");

interface EmbeddingCacheFile {
  model: string;
  dimensions: number;
  formatVersion: string;
  vectors: Record<string, number[]>;
}

export interface SemanticSearchVectorUnit {
  document: ContentDocument;
  evidence: EvidenceUnit;
}

export interface SemanticEvidenceCandidate {
  topicSpecId: string;
  documentId: string;
  evidenceUnitId: string;
  title: string;
  path: string | null;
  surface: string | null;
  role: EvidenceUnit["role"];
  headingPath: string[];
  similarity: number;
  excerpt: string;
}

function cacheKey(value: string): string {
  return createHash("sha256").update(`${GEMINI_EMBEDDING_MODEL}:${GEMINI_EMBEDDING_DIMS}:${RETRIEVAL_FORMAT_VERSION}:${value}`).digest("hex");
}

async function loadCache(cachePath: string): Promise<EmbeddingCacheFile> {
  try {
    const parsed = JSON.parse(await readFile(cachePath, "utf8")) as Partial<EmbeddingCacheFile>;
    if (parsed.model !== GEMINI_EMBEDDING_MODEL || parsed.dimensions !== GEMINI_EMBEDDING_DIMS || parsed.formatVersion !== RETRIEVAL_FORMAT_VERSION || !parsed.vectors) throw new Error("cache-version-mismatch");
    return {
      model: GEMINI_EMBEDDING_MODEL,
      dimensions: GEMINI_EMBEDDING_DIMS,
      formatVersion: RETRIEVAL_FORMAT_VERSION,
      vectors: Object.fromEntries(Object.entries(parsed.vectors).filter((entry): entry is [string, number[]] => isValidGeminiEmbedding(entry[1]))),
    };
  } catch {
    return { model: GEMINI_EMBEDDING_MODEL, dimensions: GEMINI_EMBEDDING_DIMS, formatVersion: RETRIEVAL_FORMAT_VERSION, vectors: {} };
  }
}

async function embedWithCache(formattedTexts: string[], cachePath: string): Promise<{ vectors: number[][]; hits: number; misses: number }> {
  const cache = await loadCache(cachePath);
  const keys = formattedTexts.map(cacheKey);
  const missingTexts: string[] = [];
  const missingKeys: string[] = [];
  keys.forEach((key, index) => {
    if (!cache.vectors[key]) {
      missingKeys.push(key);
      missingTexts.push(formattedTexts[index]);
    }
  });
  if (missingTexts.length > 0) {
    const embedded = await embedGeminiTexts(missingTexts);
    missingKeys.forEach((key, index) => { cache.vectors[key] = embedded[index]; });
    await mkdir(path.dirname(cachePath), { recursive: true });
    await writeFile(cachePath, JSON.stringify(cache), "utf8");
  }
  return { vectors: keys.map((key) => cache.vectors[key]), hits: keys.length - missingTexts.length, misses: missingTexts.length };
}

function topicQuery(spec: CoverageTopicSpec): string {
  const concepts = spec.concepts.flatMap((concept) => [concept.label, concept.description, ...concept.criteria.flatMap((criterion) => [criterion.label, criterion.description])]);
  return [spec.label, spec.description, ...spec.userQuestions, ...concepts].join("\n");
}

function candidateUnits(documents: ContentDocument[]): Array<{ document: ContentDocument; evidence: EvidenceUnit; formatted: string }> {
  return documents.flatMap((document) => document.units.flatMap((evidence) => {
    if (evidence.role !== "primary" && evidence.role !== "supporting") return [];
    if (!evidence.placements.some((placement) => placement.visible && placement.indexable)) return [];
    return [{ document, evidence, formatted: formatEmbeddingSearchDocument(document.title, `${evidence.headingPath.join(" > ")}\n${evidence.text}`) }];
  }));
}

export async function buildSemanticSearchVectors(
  queries: string[],
  documents: ContentDocument[],
  options: { cachePath?: string } = {},
): Promise<{
  units: SemanticSearchVectorUnit[];
  queryVectors: number[][];
  documentVectors: number[][];
  cache: { hits: number; misses: number };
}> {
  const cachePath = options.cachePath ?? DEFAULT_CACHE_PATH;
  const units = candidateUnits(documents);
  const queryTexts = queries.map(formatEmbeddingSearchQuery);
  const allResult = await embedWithCache([...queryTexts, ...units.map((item) => item.formatted)], cachePath);
  return {
    units: units.map(({ document, evidence }) => ({ document, evidence })),
    queryVectors: allResult.vectors.slice(0, queries.length),
    documentVectors: allResult.vectors.slice(queries.length),
    cache: { hits: allResult.hits, misses: allResult.misses },
  };
}

export async function buildSemanticBaseline(
  specs: CoverageTopicSpec[],
  documents: ContentDocument[],
  options: { limit?: number; cachePath?: string } = {},
): Promise<{ candidates: Record<string, SemanticEvidenceCandidate[]>; cache: { hits: number; misses: number } }> {
  const limit = options.limit ?? 10;
  const search = await buildSemanticSearchVectors(specs.map(topicQuery), documents, { cachePath: options.cachePath });
  const candidates: Record<string, SemanticEvidenceCandidate[]> = {};
  specs.forEach((spec, specIndex) => {
    const ranked = search.units.map((item, unitIndex) => {
      const placement = item.evidence.placements.find((candidate) => candidate.visible && candidate.indexable) ?? null;
      return {
        topicSpecId: spec.id,
        documentId: item.document.id,
        evidenceUnitId: item.evidence.id,
        title: item.document.title,
        path: placement?.path ?? null,
        surface: placement?.surface ?? null,
        role: item.evidence.role,
        headingPath: item.evidence.headingPath,
        similarity: cosineSimilarity(search.queryVectors[specIndex], search.documentVectors[unitIndex]),
        excerpt: item.evidence.text.replace(/\s+/g, " ").trim().slice(0, 220),
      } satisfies SemanticEvidenceCandidate;
    }).sort((a, b) => b.similarity - a.similarity || a.documentId.localeCompare(b.documentId) || a.evidenceUnitId.localeCompare(b.evidenceUnitId));
    const perDocument = new Map<string, number>();
    candidates[spec.id] = [];
    for (const candidate of ranked) {
      const count = perDocument.get(candidate.documentId) ?? 0;
      if (count >= 2) continue;
      candidates[spec.id].push(candidate);
      perDocument.set(candidate.documentId, count + 1);
      if (candidates[spec.id].length >= limit) break;
    }
  });
  return {
    candidates,
    cache: search.cache,
  };
}
