import { NextRequest, NextResponse } from "next/server";
import { createArticleWorkflows, getWorkflowSummary } from "@/lib/ai-workflow";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const summary = await getWorkflowSummary(batchId);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取 AI 流水线状态失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const articleIds = Array.isArray(body.articleIds)
      ? body.articleIds.filter((id: unknown): id is string => typeof id === "string")
      : typeof body.articleId === "string"
        ? [body.articleId]
        : [];

    if (articleIds.length === 0) {
      return NextResponse.json({ error: "缺少文章 ID" }, { status: 400 });
    }

    const batchId = typeof body.batchId === "string" && body.batchId.trim()
      ? body.batchId.trim()
      : `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const results = await createArticleWorkflows(articleIds, {
      batchId,
      source: typeof body.source === "string" ? body.source : undefined,
      policy: typeof body.policy === "string" ? body.policy : undefined,
      priority: typeof body.priority === "number" ? body.priority : undefined,
    });

    return NextResponse.json({
      batchId,
      total: articleIds.length,
      queued: results.filter((item) => item.status === "queued").length,
      failed: results.filter((item) => item.status === "failed").length,
      results,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建 AI 流水线失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
