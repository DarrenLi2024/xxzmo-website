import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeArticleListItem } from "@/lib/serialize";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const type = searchParams.get("type");
  const tag = searchParams.get("tag");
  const status = searchParams.get("status") || "published";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10")));
  const search = searchParams.get("search");

  if (status === "all" && !(await getAdminFromCookies())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where: Record<string, unknown> = {};
  if (source) where.source = source;
  if (status !== "all") where.status = status;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { body: { contains: search } },
      { tagList: { contains: search } },
    ];
  }
  if (tag) {
    where.tags = { some: { tag: { name: tag } } };
  }

  const orderBy = { createdAt: "desc" as const };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: { tags: { include: { tag: true } }, painting: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({
    articles: articles.map((a) => serializeArticleListItem(a, 200)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}