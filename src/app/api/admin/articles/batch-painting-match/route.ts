import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recommendPaintingsForPoem } from "@/lib/painting-match";

/** 批量配图推荐：只返回候选，不自动绑定 */
export async function POST(request: NextRequest) {
  try {
    const { articleIds, count = 3 } = await request.json();
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "缺少文章 ID" }, { status: 400 });
    }

    const articles = await prisma.article.findMany({
      where: { id: { in: articleIds } },
      select: { id: true, title: true, body: true, tagList: true },
    });

    const results = [];
    for (const article of articles) {
      let tags: string[] = [];
      try {
        tags = JSON.parse(article.tagList || "[]");
      } catch {
        tags = [];
      }
      const recommendation = await recommendPaintingsForPoem({
        title: article.title,
        body: article.body,
        tags,
        count,
      });
      results.push({ articleId: article.id, ...recommendation });
    }

    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量配图推荐失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
