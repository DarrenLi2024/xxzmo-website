import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-log";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const now = new Date();
  const article = await prisma.article.update({
    where: { id },
    data: {
      status: "published",
      publishedAt: now,
      sortOrder: now.getTime(),
    },
  });
  await logAdminAction({
    action: "article.publish",
    entityType: "article",
    entityId: article.id,
    summary: `发布文章「${article.title}」`,
    metadata: { source: article.source },
  });
  return NextResponse.json(article);
}
