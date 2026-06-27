import { NextRequest, NextResponse } from "next/server";
import { getDecisionsForArticle } from "@/lib/ai-artifact";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await prisma.aiWorkflowRun.findUnique({
      where: { id },
      select: { articleId: true },
    });
    if (!run?.articleId) {
      return NextResponse.json({ error: "任务不存在或缺少文章" }, { status: 404 });
    }
    const decisions = await getDecisionsForArticle(run.articleId);
    return NextResponse.json({ decisions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取决策失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
