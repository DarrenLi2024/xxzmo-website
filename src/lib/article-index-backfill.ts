import { prisma } from "@/lib/prisma";
import { persistArticleFingerprint } from "@/lib/article-dedup";
import { persistArticleEmbedding } from "@/lib/ai-embedding";

export interface BackfillResult {
  processed: number;
  fingerprints: number;
  embeddings: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

export async function backfillArticleIndex(options: {
  source?: string;
  limit?: number;
  mode?: "fingerprint" | "embedding" | "all";
  onlyMissing?: boolean;
}): Promise<BackfillResult> {
  const mode = options.mode || "all";
  const limit = Math.max(1, Math.min(options.limit || 100, 500));

  const articles = await prisma.article.findMany({
    where: {
      ...(options.source ? { source: options.source } : {}),
      ...(options.onlyMissing
        ? {
            OR: [
              { contentFingerprint: null },
              ...(mode === "embedding" || mode === "all" ? [{ contentEmbedding: null }] : []),
            ],
          }
        : {}),
    },
    select: { id: true, contentFingerprint: true, contentEmbedding: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const result: BackfillResult = {
    processed: 0,
    fingerprints: 0,
    embeddings: 0,
    skipped: 0,
    errors: [],
  };

  for (const article of articles) {
    result.processed++;
    try {
      if (mode === "fingerprint" || mode === "all") {
        if (!options.onlyMissing || !article.contentFingerprint) {
          await persistArticleFingerprint(article.id);
          result.fingerprints++;
        }
      }

      if (mode === "embedding" || mode === "all") {
        if (!options.onlyMissing || !article.contentEmbedding) {
          const embedded = await persistArticleEmbedding(article.id);
          if (embedded.embedded) {
            result.embeddings++;
          } else {
            result.skipped++;
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "回填失败";
      result.errors.push({ id: article.id, error: message });
    }
  }

  return result;
}
