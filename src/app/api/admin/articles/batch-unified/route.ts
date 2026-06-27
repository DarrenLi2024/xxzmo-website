import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createArticleWorkflows, getWorkflowSummary, runWorkflowWorker } from "@/lib/ai-workflow";

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

    return NextResponse.json({
      taskId: batchId,
      batchId,
      total: articleIds.length,
      queued: results.filter((item) => item.status === "queued").length,
      failed: results.filter((item) => item.status === "failed").length,
      chunkSize: 1,
      message: `任务已创建，共 ${articleIds.length} 篇，后台将按持久化流水线执行`,
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
    const action = searchParams.get("action");

    if (action === "execute") {
      await runWorkflowWorker({ maxRuns: 1 });
    }

    const summary = await getWorkflowSummary(taskId);
    return NextResponse.json({
      taskId,
      status: summary.counts.failed > 0 && summary.counts.completed + summary.counts.failed === summary.total
        ? "completed"
        : summary.counts.queued || summary.counts.running
          ? "running"
          : "completed",
      progress: {
        current: summary.runs.filter((run) => run.status === "completed" || run.status === "failed").length,
        total: summary.total,
        percent: summary.progress,
        success: summary.counts.completed || 0,
        failed: summary.counts.failed || 0,
        skipped: summary.counts.skipped || 0,
        pinyinCorrections: 0,
        pinyinUncertain: 0,
      },
      startedAt: summary.runs.at(-1)?.startedAt,
      completedAt: summary.runs.every((run) => run.status === "completed" || run.status === "failed")
        ? new Date().toISOString()
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取任务状态失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
