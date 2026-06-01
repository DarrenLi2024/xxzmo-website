import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeArticleListItem } from "@/lib/serialize";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limit: 30 searches per minute per IP
  const rateLimit = checkRateLimit(rateLimitKey(request, "search"), 30, 60000);
  if (!rateLimit.allowed) {
    return rateLimitResponse("搜索过于频繁，请稍后再试", rateLimit);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const tag = searchParams.get("tag");

  const where: Record<string, unknown> = { status: "published" };
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { body: { contains: q } },
      { tagList: { contains: q } },
    ];
  }
  if (tag) {
    where.tags = { some: { tag: { name: tag } } };
  }

  const articles = await prisma.article.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    articles: articles.map((a) => serializeArticleListItem(a, 150)),
    total: articles.length,
  });
}
