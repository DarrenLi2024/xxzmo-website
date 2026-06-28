import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createArticleWorkflows, getWorkflowSummary } from "@/lib/ai-workflow";
import { kickAiWorker } from "@/lib/ai-worker-kick";

export async function POST(request: NextRequest) {
  try {
    const { articleIds, source = "chuli" } = await request.json();

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "缺少文章ID列表" }, { status: 400 });
    }

    const providerCount = await prisma.llmProvider.count({ where: { enabled: true } });
    if (providerCount === 0) {
      return NextResponse.json({ error: "未配置可用的 LLM Provider" }, { status: 400 });
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const results = await createArticleWorkflows(articleIds, {
      batchId,
      source,
      policy: "batch-unified",
    });

    const queued = results.filter((item) => item.status === "queued").length;
    if (queued > 0) {
      kickAiWorker(Math.min(queued, 3));
    }

    return NextResponse.json({
      taskId: batchId,
      batchId,
      total: articleIds.length,
      queued,
      failed: results.filter((item) => item.status === "failed").length,
      message: queued > 0
        ? `已加入 ${queued} 篇到 AI 流水线，后台自动处理中`
        : "未成功加入流水线",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建任务失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    const summary = await getWorkflowSummary(taskId);
    const isDone = summary.total > 0
      && (summary.counts.queued || 0) === 0
      && (summary.counts.running || 0) === 0;

    return NextResponse.json({
      taskId,
      status: isDone ? "completed" : "running",
      progress: {
        current: summary.runs.filter((run) => run.status === "completed" || run.status === "failed").length,
        total: summary.total,
        percent: summary.progress,
        success: summary.counts.completed || 0,
        failed: summary.counts.failed || 0,
        skipped: summary.counts.skipped || 0,
      },
      startedAt: summary.runs.at(-1)?.startedAt,
      completedAt: isDone ? new Date().toISOString() : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取任务状态失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
