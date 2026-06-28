import { prisma } from "@/lib/prisma";
import { comparePromptVariants, PROMPT_EXPERIMENTS } from "@/lib/prompt-experiments";
import type { PromptAbComparison } from "@/lib/prompt-experiments";

export interface PromptQualityStat {
  promptVersion: string;
  taskName: string;
  total: number;
  success: number;
  successRate: number;
  avgDurationMs: number;
  lastRunAt: string | null;
}

export interface AiQualityReport {
  prompts: PromptQualityStat[];
  abComparisons: PromptAbComparison[];
  feedback: Record<string, number>;
  decisions: Record<string, number>;
  reviewRate: number;
  adoptionRate: number;
  periodDays: number;
}

/** Prompt 版本质量统计 + 反馈采纳率（学习闭环基础） */
export async function getAiQualityReport(periodDays = 30): Promise<AiQualityReport> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const [logs, feedbackGroups, decisionGroups] = await Promise.all([
    prisma.aiTaskLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: {
        taskName: true,
        promptVersion: true,
        success: true,
        durationMs: true,
        createdAt: true,
      },
    }),
    prisma.aiFeedback.groupBy({
      by: ["action"],
      where: { createdAt: { gte: since } },
      _count: { action: true },
    }),
    prisma.aiDecision.groupBy({
      by: ["decision"],
      where: { createdAt: { gte: since } },
      _count: { decision: true },
    }),
  ]);

  const promptMap = new Map<string, {
    promptVersion: string;
    taskName: string;
    total: number;
    success: number;
    totalDuration: number;
    lastRunAt: string | null;
  }>();

  for (const log of logs) {
    const key = `${log.taskName}::${log.promptVersion}`;
    const current = promptMap.get(key) || {
      promptVersion: log.promptVersion,
      taskName: log.taskName,
      total: 0,
      success: 0,
      totalDuration: 0,
      lastRunAt: null,
    };
    current.total++;
    if (log.success) current.success++;
    current.totalDuration += log.durationMs || 0;
    if (!current.lastRunAt) current.lastRunAt = log.createdAt.toISOString();
    promptMap.set(key, current);
  }

  const prompts = Array.from(promptMap.values())
    .map((item) => ({
      promptVersion: item.promptVersion,
      taskName: item.taskName,
      total: item.total,
      success: item.success,
      successRate: item.total > 0 ? Math.round((item.success / item.total) * 100) : 0,
      avgDurationMs: item.total > 0 ? Math.round(item.totalDuration / item.total) : 0,
      lastRunAt: item.lastRunAt,
    }))
    .sort((a, b) => b.total - a.total);

  const feedback = feedbackGroups.reduce<Record<string, number>>((acc, item) => {
    acc[item.action] = item._count.action;
    return acc;
  }, {});

  const decisions = decisionGroups.reduce<Record<string, number>>((acc, item) => {
    acc[item.decision] = item._count.decision;
    return acc;
  }, {});

  const totalFeedback = (feedback.adopt || 0) + (feedback.reject || 0) + (feedback.modify || 0);
  const adoptionRate = totalFeedback > 0
    ? Math.round(((feedback.adopt || 0) / totalFeedback) * 100)
    : 0;

  const totalDecisions = Object.values(decisions).reduce((sum, n) => sum + n, 0);
  const reviewRate = totalDecisions > 0
    ? Math.round(((decisions.review || 0) / totalDecisions) * 100)
    : 0;

  const abComparisons = PROMPT_EXPERIMENTS
    .filter((exp) => exp.enabled && exp.variants.length > 1)
    .map((exp) => comparePromptVariants(exp.taskName, prompts))
    .filter((item): item is PromptAbComparison => item !== null);

  return {
    prompts,
    abComparisons,
    feedback,
    decisions,
    reviewRate,
    adoptionRate,
    periodDays,
  };
}
