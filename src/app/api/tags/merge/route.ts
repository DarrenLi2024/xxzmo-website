import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { keepId, removeId } = await request.json();

    if (!keepId || !removeId) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    if (keepId === removeId) {
      return NextResponse.json({ error: "不能合并同一个标签" }, { status: 400 });
    }

    const [keepTag, removeTag] = await Promise.all([
      prisma.tag.findUnique({ where: { id: keepId } }),
      prisma.tag.findUnique({ where: { id: removeId } }),
    ]);

    if (!keepTag || !removeTag) {
      return NextResponse.json({ error: "标签不存在" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Find all articles linked to the tag being removed
      const removeAssociations = await tx.tagOnArticle.findMany({
        where: { tagId: removeId },
      });

      // For each article linked to removeTag, link it to keepTag if not already
      for (const assoc of removeAssociations) {
        const existing = await tx.tagOnArticle.findUnique({
          where: {
            articleId_tagId: { articleId: assoc.articleId, tagId: keepId },
          },
        });

        if (!existing) {
          await tx.tagOnArticle.create({
            data: { articleId: assoc.articleId, tagId: keepId },
          });
        }
      }

      // Delete all associations for the removed tag
      await tx.tagOnArticle.deleteMany({ where: { tagId: removeId } });

      // Recount articles for the kept tag
      const newCount = await tx.tagOnArticle.count({
        where: { tagId: keepId },
      });
      await tx.tag.update({
        where: { id: keepId },
        data: { count: newCount },
      });

      // Update tagList on affected articles
      const affectedArticles = await tx.tagOnArticle.findMany({
        where: { tagId: keepId },
        include: { article: { include: { tags: { include: { tag: true } } } } },
      });

      for (const assoc of affectedArticles) {
        const tagNames = assoc.article.tags.map((t) => t.tag.name);
        await tx.article.update({
          where: { id: assoc.articleId },
          data: { tagList: JSON.stringify(tagNames) },
        });
      }

      // Delete the removed tag
      await tx.tag.delete({ where: { id: removeId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "合并失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
