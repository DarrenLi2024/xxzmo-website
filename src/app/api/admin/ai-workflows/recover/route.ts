import { NextResponse } from "next/server";
import { recoverStuckWorkflows } from "@/lib/ai-workflow";
import { kickAiWorker } from "@/lib/ai-worker-kick";

export async function POST() {
  try {
    const result = await recoverStuckWorkflows();
    if (result.queuedRemaining > 0) {
      kickAiWorker(Math.min(result.queuedRemaining, 3));
    }
    return NextResponse.json({
      ...result,
      message: result.recoveredRuns > 0 || result.resyncedArticles > 0
        ? `已恢复 ${result.recoveredRuns} 个卡住任务，同步 ${result.resyncedArticles} 篇文章状态，队列剩余 ${result.queuedRemaining} 篇`
        : result.queuedRemaining > 0
          ? `队列中有 ${result.queuedRemaining} 篇待处理，已触发 worker`
          : "未发现卡住的任务",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "恢复 AI 任务失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
