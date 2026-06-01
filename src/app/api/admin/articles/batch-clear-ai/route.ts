import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { articleIds } = await request.json();

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "缺少文章ID列表" }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const articleId of articleIds) {
      try {
        const article = await prisma.article.findUnique({
          where: { id: articleId },
        });

        if (!article) {
          results.failed++;
          results.errors.push(`文章不存在: ${articleId}`);
          continue;
        }

        await prisma.article.update({
          where: { id: articleId },
          data: {
            translation: null,
            appreciation: null,
            annotations: null,
          },
        });

        await prisma.tagOnArticle.deleteMany({
          where: { articleId },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        const message = error instanceof Error ? error.message : "处理失败";
        results.errors.push(`${message}: ${articleId}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量清除AI配置失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
