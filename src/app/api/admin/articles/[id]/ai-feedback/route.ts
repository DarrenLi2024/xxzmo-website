import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-log";
import { saveFeedback } from "@/lib/ai-artifact";
import type { FeedbackAction } from "@/lib/ai-artifact";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const action = body.action as FeedbackAction;
    if (!action || !["adopt", "reject", "modify"].includes(action)) {
      return NextResponse.json({ error: "无效的操作类型" }, { status: 400 });
    }

    // Find the latest run for this article
    const latestRun = await prisma.aiWorkflowRun.findFirst({
      where: { articleId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!latestRun) {
      return NextResponse.json({ error: "未找到该文章的 AI 任务记录" }, { status: 404 });
    }

    // Find the latest artifact for this article if artifactId is not provided
    let artifactId = body.artifactId as string | undefined;
    if (!artifactId) {
      const latestArtifact = await prisma.aiArtifact.findFirst({
        where: { articleId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      artifactId = latestArtifact?.id;
    }

    // Save feedback
    const feedback = await saveFeedback({
      artifactId,
      runId: latestRun.id,
      articleId: id,
      action,
      reason: typeof body.reason === "string" ? body.reason : undefined,
      contentBefore: typeof body.contentBefore === "string" ? body.contentBefore : undefined,
      contentAfter: typeof body.contentAfter === "string" ? body.contentAfter : undefined,
    });

    // Log admin action
    await logAdminAction({
      action: `ai-feedback.${action}`,
      entityType: "article",
      entityId: id,
      summary: `文章 ${id} AI 反馈：${action}`,
      metadata: {
        feedbackId: feedback.id,
        runId: latestRun.id,
        artifactId: artifactId || null,
        reason: body.reason || null,
      },
    });

    // If adopting, update article status to ready
    if (action === "adopt") {
      await prisma.article.update({
        where: { id },
        data: {
          aiStatus: "ready",
          aiUpdatedAt: new Date(),
        },
      });
    }

    // If rejecting, update article status to review
    if (action === "reject") {
      await prisma.article.update({
        where: { id },
        data: {
          aiStatus: "review",
          aiUpdatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存反馈失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
