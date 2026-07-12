export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
export const GEMINI_EMBEDDING_DIMS = 768;
const BATCH_SIZE = 100;

export function isGeminiEmbeddingConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function isValidGeminiEmbedding(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length === GEMINI_EMBEDDING_DIMS
    && value.every((item): item is number => typeof item === "number" && Number.isFinite(item));
}

export async function embedGeminiTexts(formattedTexts: string[]): Promise<number[][]> {
  if (formattedTexts.length === 0) return [];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < formattedTexts.length; i += BATCH_SIZE) {
    const batch = formattedTexts.slice(i, i + BATCH_SIZE);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: batch.map((text) => ({
          model: `models/${GEMINI_EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: GEMINI_EMBEDDING_DIMS,
        })),
      }),
    });
    if (!response.ok) throw new Error(`Gemini Embedding API error (${response.status}): ${await response.text()}`);
    const data = await response.json() as { embeddings?: Array<{ values?: unknown }> };
    if (!Array.isArray(data.embeddings) || data.embeddings.length !== batch.length) {
      throw new Error(`Gemini Embedding API response count mismatch: requested ${batch.length}, received ${data.embeddings?.length ?? 0}`);
    }
    data.embeddings.forEach((embedding, index) => {
      if (!isValidGeminiEmbedding(embedding.values)) {
        throw new Error(`Gemini Embedding API invalid vector at index ${index}: expected ${GEMINI_EMBEDDING_DIMS} finite numbers`);
      }
      allEmbeddings.push(embedding.values);
    });
  }
  return allEmbeddings;
}

export function formatEmbeddingSearchQuery(text: string): string {
  return `task: search result | query: ${text}`;
}

export function formatEmbeddingSearchDocument(title: string | null, text: string): string {
  return `title: ${title?.trim() || "none"} | text: ${text}`;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}
