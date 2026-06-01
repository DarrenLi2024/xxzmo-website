import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function syncArticleTags(articleId: string, tagNames: string[]) {
  if (tagNames.length === 0) return;

  await prisma.$transaction(async (tx) => {
    const tags = await Promise.all(
      tagNames.map((name) =>
        tx.tag.upsert({ where: { name }, create: { name }, update: {} })
      )
    );

    await tx.tagOnArticle.deleteMany({ where: { articleId } });

    await tx.tagOnArticle.createMany({
      data: tags.map((t) => ({ articleId, tagId: t.id })),
    });

    await Promise.all(
      tags.map((t) =>
        tx.tag.update({
          where: { id: t.id },
          data: { count: { increment: 1 } },
        })
      )
    );
  });
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
