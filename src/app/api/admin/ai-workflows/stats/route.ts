import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      queuedCount,
      runningCount,
      reviewCount,
      readyCount,
      failedCount,
      totalCount,
    ] = await Promise.all([
      prisma.aiWorkflowRun.count({ where: { status: "queued" } }),
      prisma.aiWorkflowRun.count({ where: { status: "running" } }),
      prisma.article.count({ where: { aiStatus: "review" } }),
      prisma.article.count({ where: { aiStatus: "ready" } }),
      prisma.article.count({ where: { aiStatus: "failed" } }),
      prisma.article.count({ where: { aiStatus: { not: null } } }),
    ]);

    return NextResponse.json({
      queued: queuedCount,
      running: runningCount,
      review: reviewCount,
      ready: readyCount,
      failed: failedCount,
      total: totalCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取统计失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
