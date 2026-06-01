import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function syncArticleTags(articleId: string, tagNames: string[]) {
  if (tagNames.length === 0) return;

  await prisma.$transaction(async (tx) => {
    const tags: Array<{ id: string; name: string }> = [];

    for (const name of tagNames) {
      const tag = await tx.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      tags.push(tag);
    }

    await tx.tagOnArticle.deleteMany({ where: { articleId } });

    if (tags.length > 0) {
      await tx.tagOnArticle.createMany({
        data: tags.map((t) => ({ articleId, tagId: t.id })),
      });
    }

    for (const tag of tags) {
      await tx.tag.update({
        where: { id: tag.id },
        data: { count: { increment: 1 } },
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

export async function updateArticleTags(articleId: string, tagNames: string[]) {
  await prisma.tagOnArticle.deleteMany({ where: { articleId } });
  await syncArticleTags(articleId, tagNames);
}
