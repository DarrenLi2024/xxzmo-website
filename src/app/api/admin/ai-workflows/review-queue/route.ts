import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const articles = await prisma.article.findMany({
      where: { aiStatus: "review" },
      orderBy: [{ aiRiskLevel: "desc" }, { aiUpdatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        title: true,
        author: true,
        type: true,
        source: true,
        aiStatus: true,
        aiConfidence: true,
        aiRiskLevel: true,
        aiUpdatedAt: true,
      },
    });

    return NextResponse.json({ articles, total: articles.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取复核队列失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
