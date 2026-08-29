// Retrieval for "Ask LOOP" (AI3). The brief's suggested approach is pgvector or a
// hosted embeddings provider. To keep this buildable in 4 weeks by a beginner
// without provisioning a vector extension or a second API key, we use a
// lightweight TF-IDF-style keyword vector computed and compared in plain
// JavaScript, stored in the Embedding table as JSON instead of a real vector type.
//
// This is a legitimate, explainable simplification: the pattern (embed -> store ->
// retrieve top-K -> ground the answer) is identical to the "real" version. Swapping
// this file for real embeddings (e.g. Voyage AI or OpenAI embeddings) later would
// not require changing anything else in the app — that's the point of isolating it here.

const STOPWORDS = new Set([
  "the","a","an","is","it","to","and","of","in","on","for","this","that","i","we",
  "you","they","was","are","be","with","as","at","by","or","but","not","have","has",
  "had","do","does","did","so","if","my","our","your","their","can","could","would",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Turns text into a term-frequency vector, e.g. { onboarding: 2, slow: 1 } */
export function toVector(text: string): Record<string, number> {
  const tokens = tokenize(text);
  const vec: Record<string, number> = {};
  for (const t of tokens) vec[t] = (vec[t] ?? 0) + 1;
  return vec;
}

/** Cosine similarity between two sparse term-frequency vectors. */
export function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, magA = 0, magB = 0;
  for (const k of keys) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Given a query and a list of candidate {id, vector} pairs, return the top-K ids by similarity. */
export function topKMatches(
  queryVector: Record<string, number>,
  candidates: { id: string; vector: Record<string, number> }[],
  k: number
): { id: string; score: number }[] {
  return candidates
    .map((c) => ({ id: c.id, score: cosineSimilarity(queryVector, c.vector) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
