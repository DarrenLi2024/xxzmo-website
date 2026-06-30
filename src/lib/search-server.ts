import "server-only";
import { prisma } from "@/lib/prisma";
import { serializeArticleListItem } from "@/lib/serialize";

export async function searchArticles(q?: string, tag?: string) {
  const query = q?.trim() || "";
  const tagFilter = tag?.trim() || "";

  if (!query && !tagFilter) {
    return [];
  }

  const where: Record<string, unknown> = { status: "published" };
  if (query) {
    where.OR = [
      { title: { contains: query } },
      { body: { contains: query } },
      { tagList: { contains: query } },
    ];
  }
  if (tagFilter) {
    where.tags = { some: { tag: { name: tagFilter } } };
  }

  const articles = await prisma.article.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  return articles.map((article) => serializeArticleListItem(article, 150));
}
