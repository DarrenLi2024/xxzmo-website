import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Sync article tags within a transaction.
 * Updates article-tag associations and keeps Tag.count accurate via
 * database-level real counts (no manual increment/decrement drift).
 */
export async function syncArticleTags(articleId: string, tagNames: string[]) {
  await prisma.$transaction(async (tx) => {
    // 1. Collect current tag associations for this article
    const oldRelations = await tx.tagOnArticle.findMany({
      where: { articleId },
      select: { tagId: true },
    });
    const oldTagIds = new Set(oldRelations.map((r) => r.tagId));

    // 2. Upsert new tags
    const newTags: Array<{ id: string; name: string }> = [];
    for (const name of tagNames) {
      if (!name.trim()) continue;
      const tag = await tx.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      newTags.push(tag);
    }

    // 3. Replace associations atomically (delete all old, insert all new)
    await tx.tagOnArticle.deleteMany({ where: { articleId } });
    if (newTags.length > 0) {
      await tx.tagOnArticle.createMany({
        data: newTags.map((t) => ({ articleId, tagId: t.id })),
      });
    }

    // 4. Recompute counts from real database state (no drift)
    const newTagIds = new Set(newTags.map((t) => t.id));
    const allAffectedIds = new Set([...oldTagIds, ...newTagIds]);

    for (const tagId of allAffectedIds) {
      const realCount = await tx.tagOnArticle.count({
        where: { tagId },
      });
      await tx.tag.update({
        where: { id: tagId },
        data: { count: realCount },
      });
    }
  }, { timeout: 30000 });
}

export async function createArticleWithTags(
  args: Prisma.ArticleCreateArgs,
  tagNames: string[]
) {
  const article = await prisma.article.create(args);
  await syncArticleTags(article.id, tagNames);
  return article;
}

/**
 * Replace article tags entirely.
 * Old associations are removed, counts are recomputed from DB.
 */
export async function updateArticleTags(articleId: string, tagNames: string[]) {
  await syncArticleTags(articleId, tagNames);
}
