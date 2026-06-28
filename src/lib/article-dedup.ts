import { prisma } from "@/lib/prisma";
import {
  computeArticleFingerprint,
  simhashSimilarity,
  type ArticleFingerprintInput,
} from "@/lib/ai-fingerprint";
import { cosineSimilarity, parseEmbedding } from "@/lib/ai-embedding";

export interface DuplicatePair {
  id1: string;
  title1: string;
  id2: string;
  title2: string;
  similarity: number;
  type: "exact" | "similar";
}

export interface DuplicateCheckResult {
  duplicate: boolean;
  id?: string;
  title?: string;
  similarity?: number;
  type?: "exact" | "similar";
  method?: "title" | "simhash" | "levenshtein";
}

const SIMHASH_THRESHOLD = 0.85;
const EXACT_THRESHOLD = 0.98;

function comparableText(article: ArticleFingerprintInput): string {
  return `${article.title}${article.preface || ""}${article.body}${article.postscript || ""}`
    .replace(/\s+/g, "")
    .replace(/[，。！？、；：,.!?;:]/g, "");
}

function levenshteinSimilarity(left: string, right: string): number {
  const a = left.slice(0, 1000);
  const b = right.slice(0, 1000);
  const longer = Math.max(a.length, b.length);
  if (longer === 0) return 1;
  if (a === b) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= a.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= b.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (a.charAt(i - 1) !== b.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[b.length] = lastValue;
  }
  const distance = costs[b.length] || 0;
  return (Math.min(longer, 1000) - distance) / Math.min(longer, 1000);
}

function classifySimilarity(similarity: number): "exact" | "similar" {
  return similarity >= EXACT_THRESHOLD ? "exact" : "similar";
}

function compareArticles(
  left: ArticleFingerprintInput & {
    id: string;
    title: string;
    contentFingerprint?: string | null;
    contentEmbedding?: string | null;
  },
  right: ArticleFingerprintInput & {
    id: string;
    title: string;
    contentFingerprint?: string | null;
    contentEmbedding?: string | null;
  }
): number {
  const leftEmbedding = parseEmbedding(left.contentEmbedding);
  const rightEmbedding = parseEmbedding(right.contentEmbedding);
  if (leftEmbedding && rightEmbedding) {
    const embeddingSim = cosineSimilarity(leftEmbedding, rightEmbedding);
    if (embeddingSim >= 0.92) return embeddingSim;
  }

  if (left.title.trim() === right.title.trim()) {
    const textSim = levenshteinSimilarity(comparableText(left), comparableText(right));
    if (textSim >= SIMHASH_THRESHOLD) return textSim;
  }

  const leftFp = left.contentFingerprint || computeArticleFingerprint(left).simhash;
  const rightFp = right.contentFingerprint || computeArticleFingerprint(right).simhash;
  const hashSim = simhashSimilarity(leftFp, rightFp);
  if (hashSim >= SIMHASH_THRESHOLD) return hashSim;

  return levenshteinSimilarity(comparableText(left), comparableText(right));
}

/** 单篇去重检测（流水线用）：指纹分桶召回 + 精确比较 */
export async function checkArticleDuplicate(articleId: string): Promise<DuplicateCheckResult> {
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

  const fingerprint = article.contentFingerprint || computeArticleFingerprint(article).simhash;
  const bucket = fingerprint.slice(0, 4);

  const candidates = await prisma.article.findMany({
    where: {
      id: { not: article.id },
      source: article.source,
      OR: [
        { title: article.title },
        { contentFingerprint: { startsWith: bucket } },
        ...(article.contentEmbedding ? [{ contentEmbedding: { not: null } }] : []),
      ],
    },
    select: {
      id: true,
      title: true,
      body: true,
      preface: true,
      postscript: true,
      contentFingerprint: true,
      contentEmbedding: true,
    },
    take: 80,
  });

  let best: { id: string; title: string; similarity: number; type: "exact" | "similar" } | null = null;

  for (const candidate of candidates) {
    const similarity = compareArticles(article, candidate);
    if (!best || similarity > best.similarity) {
      best = {
        id: candidate.id,
        title: candidate.title,
        similarity,
        type: classifySimilarity(similarity),
      };
    }
  }

  if (best && best.similarity >= SIMHASH_THRESHOLD) {
    return { duplicate: true, ...best };
  }

  return { duplicate: false };
}

/** 批量去重检测：分桶后桶内比较，避免 O(n²) 全量 */
export async function findDuplicatePairs(options: {
  source?: string;
  threshold?: number;
}): Promise<{ duplicates: DuplicatePair[]; total: number; threshold: number }> {
  const threshold = options.threshold ?? SIMHASH_THRESHOLD;

  const where: Record<string, unknown> = {};
  if (options.source) where.source = options.source;

  const articles = await prisma.article.findMany({
    where,
    select: {
      id: true,
      title: true,
      body: true,
      preface: true,
      postscript: true,
      contentFingerprint: true,
    },
  });

  const enriched = articles.map((article) => ({
    ...article,
    fp: article.contentFingerprint || computeArticleFingerprint(article).simhash,
    bucket: (article.contentFingerprint || computeArticleFingerprint(article).simhash).slice(0, 4),
    titleKey: computeArticleFingerprint(article).titleKey,
  }));

  const bucketMap = new Map<string, typeof enriched>();
  const titleMap = new Map<string, typeof enriched>();

  for (const article of enriched) {
    const bucketList = bucketMap.get(article.bucket) || [];
    bucketList.push(article);
    bucketMap.set(article.bucket, bucketList);

    const titleList = titleMap.get(article.titleKey) || [];
    titleList.push(article);
    titleMap.set(article.titleKey, titleList);
  }

  const compared = new Set<string>();
  const duplicates: DuplicatePair[] = [];

  function comparePair(a: typeof enriched[0], b: typeof enriched[0]) {
    if (a.id >= b.id) return;
    const key = `${a.id}:${b.id}`;
    if (compared.has(key)) return;
    compared.add(key);

    const similarity = compareArticles(a, b);
    if (similarity >= threshold) {
      duplicates.push({
        id1: a.id,
        title1: a.title,
        id2: b.id,
        title2: b.title,
        similarity: Number(similarity.toFixed(4)),
        type: classifySimilarity(similarity),
      });
    }
  }

  for (const group of bucketMap.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        comparePair(group[i], group[j]);
      }
    }
  }

  for (const group of titleMap.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        comparePair(group[i], group[j]);
      }
    }
  }

  duplicates.sort((a, b) => b.similarity - a.similarity);

  return { duplicates, total: duplicates.length, threshold };
}

/** 规范化时写入文章指纹 */
export async function persistArticleFingerprint(articleId: string): Promise<string> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, body: true, preface: true, postscript: true, contentFingerprint: true },
  });
  if (!article) throw new Error("文章不存在");

  const { simhash } = computeArticleFingerprint(article);
  if (article.contentFingerprint !== simhash) {
    await prisma.article.update({
      where: { id: articleId },
      data: { contentFingerprint: simhash },
    });
  }
  return simhash;
}
