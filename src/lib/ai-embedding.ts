import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { computeArticleFingerprint } from "@/lib/ai-fingerprint";
import { simhashSimilarity } from "@/lib/ai-fingerprint";

interface EmbeddingEndpoint {
  name: string;
  baseUrl: string;
  model: string;
  envKey: string;
}

const EMBEDDING_ENDPOINTS: EmbeddingEndpoint[] = [
  {
    name: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "text-embedding-3-small",
    envKey: "OPENAI_API_KEY",
  },
  {
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/text-embedding-3-small",
    envKey: "OPENROUTER_API_KEY",
  },
];

const ALLOWED_EMBEDDING_HOSTS = [
  "api.openai.com",
  "openrouter.ai",
  "open.bigmodel.cn",
  "api.zhipuai.cn",
];

export interface EmbeddingResult {
  vector: number[];
  providerName: string;
  model: string;
  durationMs: number;
}

export function parseEmbedding(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((n) => typeof n === "number") ? parsed : null;
  } catch {
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function validateEmbeddingUrl(url: string) {
  const parsed = new URL(url);
  const allowed = ALLOWED_EMBEDDING_HOSTS.some((host) => parsed.hostname.endsWith(host));
  if (!allowed) throw new Error(`Embedding URL not allowed: ${parsed.hostname}`);
}

function resolveEmbeddingKey(endpoint: EmbeddingEndpoint): string | undefined {
  return process.env[endpoint.envKey];
}

/** 调用 OpenAI 兼容 Embedding API */
export async function embedText(text: string): Promise<EmbeddingResult> {
  const input = text.trim().slice(0, 8000);
  if (input.length < 4) throw new Error("Embedding 输入过短");

  const failures: string[] = [];

  for (const endpoint of EMBEDDING_ENDPOINTS) {
    const apiKey = resolveEmbeddingKey(endpoint);
    if (!apiKey) {
      failures.push(`${endpoint.name} 未配置 API Key`);
      continue;
    }

    const baseUrl = endpoint.baseUrl.replace(/\/+$/, "");
    validateEmbeddingUrl(baseUrl);
    const url = `${baseUrl}/embeddings`;
    const startedAt = Date.now();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: endpoint.model, input }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        failures.push(`${endpoint.name} 返回 ${res.status}`);
        continue;
      }

      const data = await res.json();
      const vector = data?.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length === 0) {
        failures.push(`${endpoint.name} 返回空向量`);
        continue;
      }

      return {
        vector: vector as number[],
        providerName: endpoint.name,
        model: endpoint.model,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${endpoint.name}: ${message}`);
    }
  }

  throw new Error(
    failures.length > 0
      ? `Embedding 不可用（${failures.join("；")}）`
      : "Embedding 不可用：请配置 OPENAI_API_KEY 或 OPENROUTER_API_KEY"
  );
}

export function buildArticleEmbeddingText(article: {
  title: string;
  preface?: string | null;
  body: string;
  postscript?: string | null;
  type?: string;
}) {
  return [
    article.title,
    article.type ? `体裁：${article.type}` : "",
    article.preface || "",
    article.body,
    article.postscript || "",
  ].filter(Boolean).join("\n");
}

export async function persistArticleEmbedding(articleId: string): Promise<{
  embedded: boolean;
  dimensions?: number;
  model?: string;
}> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, type: true, body: true, preface: true, postscript: true, contentEmbedding: true },
  });
  if (!article) throw new Error("文章不存在");

  try {
    const result = await embedText(buildArticleEmbeddingText(article));
    await prisma.article.update({
      where: { id: articleId },
      data: {
        contentEmbedding: JSON.stringify(result.vector),
        embeddingModel: result.model,
        embeddedAt: new Date(),
      },
    });
    return { embedded: true, dimensions: result.vector.length, model: result.model };
  } catch {
    return { embedded: false };
  }
}

export interface SimilarArticle {
  id: string;
  title: string;
  source: string;
  similarity: number;
  method: "embedding" | "simhash";
}

/** 相似文章召回：优先 embedding，fallback simhash */
export async function findSimilarArticles(
  articleId: string,
  options?: { limit?: number; source?: string; minSimilarity?: number }
): Promise<SimilarArticle[]> {
  const limit = options?.limit ?? 10;
  const minSimilarity = options?.minSimilarity ?? 0.75;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      source: true,
      body: true,
      preface: true,
      postscript: true,
      contentFingerprint: true,
      contentEmbedding: true,
    },
  });
  if (!article) throw new Error("文章不存在");

  const source = options?.source ?? article.source;
  const queryEmbedding = parseEmbedding(article.contentEmbedding);
  const querySimhash = article.contentFingerprint || computeArticleFingerprint(article).simhash;
  const bucket = querySimhash.slice(0, 4);

  const candidates = await prisma.article.findMany({
    where: {
      id: { not: article.id },
      source,
      OR: [
        { contentFingerprint: { startsWith: bucket } },
        { contentEmbedding: { not: null } },
      ],
    },
    select: {
      id: true,
      title: true,
      source: true,
      body: true,
      preface: true,
      postscript: true,
      contentFingerprint: true,
      contentEmbedding: true,
    },
    take: 120,
  });

  const scored: SimilarArticle[] = [];

  for (const candidate of candidates) {
    const candidateEmbedding = parseEmbedding(candidate.contentEmbedding);

    if (queryEmbedding && candidateEmbedding) {
      const similarity = cosineSimilarity(queryEmbedding, candidateEmbedding);
      if (similarity >= minSimilarity) {
        scored.push({
          id: candidate.id,
          title: candidate.title,
          source: candidate.source,
          similarity: Number(similarity.toFixed(4)),
          method: "embedding",
        });
        continue;
      }
    }

    const leftFp = querySimhash;
    const rightFp = candidate.contentFingerprint || computeArticleFingerprint(candidate).simhash;
    const similarity = simhashSimilarity(leftFp, rightFp);
    if (similarity >= minSimilarity) {
      scored.push({
        id: candidate.id,
        title: candidate.title,
        source: candidate.source,
        similarity: Number(similarity.toFixed(4)),
        method: "simhash",
      });
    }
  }

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/** 确定性 A/B 分桶（0-99） */
export function experimentBucket(seed: string, taskName: string): number {
  const hash = createHash("sha256").update(`${taskName}:${seed}`).digest();
  return hash[0] % 100;
}
