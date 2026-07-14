import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  embedGeminiTexts,
  GEMINI_EMBEDDING_DIMS,
  GEMINI_EMBEDDING_MODEL,
  isValidGeminiEmbedding,
} from "./gemini-embeddings";
import { KEYWORD_SHADOW_ENGINE_VERSION } from "./keyword-candidate-shadow";

const DEFAULT_CACHE_PATH = path.resolve(process.cwd(), ".tmp/keyword-candidate-shadow-embeddings.json");
const EMBEDDING_CHUNK_SIZE = 1_000;
const MAX_RATE_LIMIT_RETRIES = 8;

interface CacheFile {
  model: string;
  dimensions: number;
  engineVersion: string;
  vectors: Record<string, number[]>;
}

function cacheKey(text: string): string {
  return createHash("sha256").update(`${GEMINI_EMBEDDING_MODEL}:${GEMINI_EMBEDDING_DIMS}:${KEYWORD_SHADOW_ENGINE_VERSION}:${text}`).digest("hex");
}

function loadCache(cachePath: string): CacheFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, "utf8")) as Partial<CacheFile>;
    if (parsed.model !== GEMINI_EMBEDDING_MODEL || parsed.dimensions !== GEMINI_EMBEDDING_DIMS || parsed.engineVersion !== KEYWORD_SHADOW_ENGINE_VERSION || !parsed.vectors) throw new Error("cache-version-mismatch");
    return {
      model: GEMINI_EMBEDDING_MODEL,
      dimensions: GEMINI_EMBEDDING_DIMS,
      engineVersion: KEYWORD_SHADOW_ENGINE_VERSION,
      vectors: Object.fromEntries(Object.entries(parsed.vectors).filter((entry): entry is [string, number[]] => isValidGeminiEmbedding(entry[1]))),
    };
  } catch {
    return { model: GEMINI_EMBEDDING_MODEL, dimensions: GEMINI_EMBEDDING_DIMS, engineVersion: KEYWORD_SHADOW_ENGINE_VERSION, vectors: {} };
  }
}

function persistCache(cachePath: string, cache: CacheFile): void {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedChunkWithRetry(texts: string[]): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await embedGeminiTexts(texts);
    } catch (error) {
      const rateLimited = error instanceof Error && error.message.includes("429");
      if (!rateLimited || attempt >= MAX_RATE_LIMIT_RETRIES) throw error;
      await sleep(Math.min(15_000 * (attempt + 1), 45_000));
    }
  }
}

export async function embedKeywordShadowTexts(texts: string[], cachePath = DEFAULT_CACHE_PATH) {
  const cache = loadCache(cachePath);
  const keys = texts.map(cacheKey);
  const missing = keys.flatMap((key, index) => cache.vectors[key] ? [] : [{ key, text: texts[index] }]);
  for (let offset = 0; offset < missing.length; offset += EMBEDDING_CHUNK_SIZE) {
    const chunk = missing.slice(offset, offset + EMBEDDING_CHUNK_SIZE);
    const vectors = await embedChunkWithRetry(chunk.map((item) => item.text));
    chunk.forEach((item, index) => { cache.vectors[item.key] = vectors[index]; });
    persistCache(cachePath, cache);
  }
  return { vectors: keys.map((key) => cache.vectors[key]), hits: keys.length - missing.length, misses: missing.length };
}
