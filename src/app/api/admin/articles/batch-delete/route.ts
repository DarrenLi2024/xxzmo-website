import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface BatchDeleteRequest {
  ids: string[];
}

export async function POST(request: Request) {
  try {
    const { ids }: BatchDeleteRequest = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "请提供要删除的文章ID列表" },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length > 50) {
      return NextResponse.json(
        { error: "单次最多删除 50 篇文章" },
        { status: 400 }
      );
    }

    const articles = await prisma.article.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, title: true, source: true },
    });

    if (articles.length === 0) {
      return NextResponse.json(
        { error: "未找到要删除的文章" },
        { status: 404 }
      );
    }

    const result = await prisma.article.deleteMany({
      where: { id: { in: articles.map(a => a.id) } },
    });

    return NextResponse.json({
      deleted: result.count,
      articles: articles.map(a => ({
        id: a.id,
        title: a.title,
        source: a.source,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量删除失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
