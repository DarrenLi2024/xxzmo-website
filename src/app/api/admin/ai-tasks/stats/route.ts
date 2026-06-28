import { NextResponse } from "next/server";
import { getAiTaskStats } from "@/lib/ai-task";
import { getFeedbackStats, getDecisionStats } from "@/lib/ai-artifact";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const [tasks, feedback, decisions, totalCalls, failedCalls, avgDuration] = await Promise.all([
    getAiTaskStats(),
    getFeedbackStats(),
    getDecisionStats(),
    prisma.aiTaskLog.count({ where: { createdAt: { gte: since } } }),
    prisma.aiTaskLog.count({ where: { createdAt: { gte: since }, success: false } }),
    prisma.aiTaskLog.aggregate({
      where: { createdAt: { gte: since }, success: true },
      _avg: { durationMs: true },
    }),
  ]);

  return NextResponse.json({
    tasks,
    feedback,
    decisions,
    summary: {
      totalCalls,
      failedCalls,
      successRate: totalCalls > 0 ? Math.round(((totalCalls - failedCalls) / totalCalls) * 100) : 0,
      avgDurationMs: Math.round(avgDuration._avg.durationMs || 0),
      periodDays: 7,
    },
  });
}
