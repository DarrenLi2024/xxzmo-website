import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-log";

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids 必须是非空数组" }, { status: 400 });
    }

    if (ids.length > 500) {
      return NextResponse.json({ error: "单次最多删除 500 篇" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const articles = await tx.article.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, source: true, status: true },
      });

      await tx.article.deleteMany({
        where: { id: { in: ids } },
      });

      return { articles };
    });

    for (const article of result.articles) {
      await logAdminAction({
        action: "article.batch_delete",
        entityType: "article",
        entityId: article.id,
        summary: `批量删除文章「${article.title}」`,
        metadata: { source: article.source, status: article.status },
      });
    }

    return NextResponse.json({
      success: true,
      deleted: result.articles.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量删除失败";
    console.error("[batch-delete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
