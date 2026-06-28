import { prisma } from "@/lib/prisma";
import { runUnifiedCalibration } from "@/lib/unified-calibration";
import { getOrCreateFormatAnalysis } from "@/lib/format-analysis";
import { runAiTask } from "@/lib/ai-task";
import { articleReviewSchema } from "@/lib/ai-schemas";
import {
  saveArtifact,
  saveDecision,
  type ArtifactType,
} from "@/lib/ai-artifact";
import { planArticlePipeline } from "@/lib/ai-planner";
import { computeArticleContentHash } from "@/lib/ai-content-hash";
import { checkArticleDuplicate, persistArticleFingerprint } from "@/lib/article-dedup";
import { runParallelExperts } from "@/lib/parallel-experts";
import { recommendPaintingsForPoem } from "@/lib/painting-match";
import { persistArticleEmbedding } from "@/lib/ai-embedding";
import { resolvePromptVersion, getPromptRuntimeOptions } from "@/lib/prompt-experiments";
import { WORKFLOW_STEPS, type AiWorkflowStepName } from "@/lib/ai-workflow-types";

export { WORKFLOW_STEPS, type AiWorkflowStepName } from "@/lib/ai-workflow-types";

interface CreateWorkflowInput {
  articleId: string;
  batchId?: string | null;
  source?: string;
  policy?: string;
  priority?: number;
}

interface WorkerOptions {
  maxRuns?: number;
  workerId?: string;
}

interface ReviewIssue {
  category: string;
  severity: "low" | "medium" | "high";
  target: string;
  detail: string;
  suggestion: string;
  field?: string;
  original: string;
  replacement: string;
}

interface ReviewReport {
  overall: "pass" | "review" | "risk";
  score: number;
  summary: string;
  issues: ReviewIssue[];
  strengths: string[];
  publishAdvice: string;
  generatedAt: string;
  source: {
    provider: "configured-llm";
    promptVersion: string;
  };
}

// === Constants ===
const ZOMBIE_STEP_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const ZOMBIE_RUN_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutes
const MAX_INPUT_LENGTH = 50000; // safety limit for AI inputs
const MAX_RUNS_PER_WORKER = 5;
const WORKER_LEASE_MS = 5 * 60 * 1000;

function createWorkerId() {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// 1. Workflow Creation & Queueing
// ============================================================================

export async function createArticleWorkflow(input: CreateWorkflowInput) {
  const article = await prisma.article.findUnique({
    where: { id: input.articleId },
    select: { id: true, source: true, title: true, body: true, preface: true, postscript: true },
  });
  if (!article) throw new Error("文章不存在");

  // Idempotency: skip if already queued or running
  const existing = await prisma.aiWorkflowRun.findFirst({
    where: {
      articleId: article.id,
      status: { in: ["queued", "running"] },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (existing) return existing;

  const run = await prisma.aiWorkflowRun.create({
    data: {
      articleId: article.id,
      batchId: input.batchId || null,
      source: input.source || article.source,
      policy: input.policy || "standard",
      priority: input.priority || 0,
      steps: {
        create: WORKFLOW_STEPS.map((name, index) => ({
          name,
          order: index + 1,
          input: JSON.stringify({ articleId: article.id }),
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  await prisma.article.update({
    where: { id: article.id },
    data: {
      aiStatus: "queued",
      aiUpdatedAt: new Date(),
    },
  });

  return run;
}

export async function createArticleWorkflows(articleIds: string[], options?: {
  batchId?: string | null;
  source?: string;
  policy?: string;
  priority?: number;
}) {
  const results = [];
  for (const articleId of articleIds) {
    try {
      const run = await createArticleWorkflow({
        articleId,
        batchId: options?.batchId,
        source: options?.source,
        policy: options?.policy,
        priority: options?.priority,
      });
      results.push({ articleId, runId: run.id, status: "queued" as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建任务失败";
      results.push({ articleId, runId: null, status: "failed" as const, error: message });
    }
  }
  return results;
}

// ============================================================================
// 2. Worker & Execution
// ============================================================================

export async function runWorkflowWorker(options: WorkerOptions = {}) {
  // 1. Recover zombie steps and runs before claiming new work
  await recoverZombieSteps();
  await recoverZombieRuns();

  const workerId = options.workerId || createWorkerId();
  const maxRuns = Math.max(1, Math.min(options.maxRuns || 1, MAX_RUNS_PER_WORKER));
  const claimed = [];

  for (let i = 0; i < maxRuns; i++) {
    const run = await claimNextRun(workerId);
    if (!run) break;
    claimed.push(run);
  }

  const results = await Promise.all(claimed.map((run) => executeRun(run.id, workerId)));
  return {
    workerId,
    claimed: claimed.length,
    results,
  };
}

async function claimNextRun(workerId: string) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + WORKER_LEASE_MS);

  const run = await prisma.aiWorkflowRun.findFirst({
    where: {
      status: "queued",
      OR: [
        { lockedUntil: null },
        { lockedUntil: { lt: now } },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  if (!run) return null;

  const updated = await prisma.aiWorkflowRun.updateMany({
    where: {
      id: run.id,
      status: "queued",
      OR: [
        { lockedUntil: null },
        { lockedUntil: { lt: now } },
      ],
    },
    data: {
      status: "running",
      startedAt: run.startedAt || now,
      error: null,
      workerId,
      lockedUntil: leaseUntil,
    },
  });
  if (updated.count === 0) return null;

  if (run.articleId) {
    await prisma.article.update({
      where: { id: run.articleId },
      data: { aiStatus: "running", aiUpdatedAt: new Date() },
    });
  }

  return run;
}

async function executeRun(runId: string, workerId?: string) {
  const run = await prisma.aiWorkflowRun.findUnique({
    where: { id: runId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!run || !run.articleId) {
    return { runId, status: "failed", error: "任务不存在或缺少文章" };
  }

  if (workerId && run.workerId && run.workerId !== workerId) {
    return { runId, status: "skipped", error: "任务已被其他 worker 领取" };
  }

  let dedupBlocked = false;

  try {
    const plan = await planArticlePipeline(run.articleId, run.policy);

    await saveStepDecision(
      run.id,
      run.articleId,
      "planner.route",
      plan.skipSteps.length > 0 ? "skipped" : "ready",
      undefined,
      [
        `tier:${plan.tier}`,
        `contentHash:${plan.contentHash}`,
        ...Object.entries(plan.skipReasons).map(([step, reason]) => `${step}: ${reason}`),
      ]
    );

    for (const step of run.steps) {
      if (step.status === "completed" || step.status === "skipped") continue;

      // If dedup already blocked, skip remaining steps
      if (dedupBlocked) {
        await skipStep(step.id, "去重阻断");
        continue;
      }

      // Planner: skip steps that don't need re-processing
      if (plan.skipSteps.includes(step.name as AiWorkflowStepName)) {
        await skipStep(step.id, plan.skipReasons[step.name as AiWorkflowStepName] || "Planner 跳过");
        continue;
      }

      const output = await executeStep(
        run.id,
        run.articleId,
        step.name as AiWorkflowStepName,
        step.id,
        plan.contentHash
      );

      // Check if dedup blocked the pipeline
      if (output && typeof output === "object" && "duplicate" in output && output.duplicate === true) {
        dedupBlocked = true;
        // Save dedup decision
        await saveStepDecision(
          run.id,
          run.articleId,
          "dedupe.check",
          output.similarity && typeof output.similarity === "number" && output.similarity >= 0.98 ? "skipped" : "review",
          typeof output.similarity === "number" ? output.similarity : undefined,
          [output.type === "exact" ? "精确重复" : "相似重复"]
        );
        // Update article with dedup info
        if (output.similarity && typeof output.similarity === "number" && output.similarity >= 0.98) {
          // Exact duplicate: mark as review with high risk
          await prisma.article.update({
            where: { id: run.articleId },
            data: { aiStatus: "review", aiRiskLevel: "high", aiUpdatedAt: new Date() },
          });
        }
      }
    }

    const finalStatus = dedupBlocked ? "completed" : "completed";
    const completedRun = await prisma.aiWorkflowRun.update({
      where: { id: run.id },
      data: {
        status: finalStatus,
        progress: 100,
        completedAt: new Date(),
        error: dedupBlocked ? "去重阻断：检测到重复内容" : null,
        lockedUntil: null,
        workerId: null,
      },
    });

    return { runId, status: completedRun.status, dedupBlocked };
  } catch (error) {
    const message = error instanceof Error ? error.message : "任务执行失败";
    await prisma.aiWorkflowRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        error: message,
        completedAt: new Date(),
        lockedUntil: null,
        workerId: null,
      },
    });
    await prisma.article.update({
      where: { id: run.articleId },
      data: {
        aiStatus: "failed",
        aiRiskLevel: "high",
        aiUpdatedAt: new Date(),
      },
    });
    return { runId, status: "failed", error: message };
  }
}

async function executeStep(
  runId: string,
  articleId: string,
  stepName: AiWorkflowStepName,
  stepId?: string,
  contentHash?: string
) {
  const step = await prisma.aiWorkflowStep.findFirst({
    where: { runId, name: stepName },
  });
  if (!step) throw new Error(`缺少步骤：${stepName}`);

  // Atomic step-level lock: only claim if queued or failed
  const claimed = await prisma.aiWorkflowStep.updateMany({
    where: { id: step.id, status: { in: ["queued", "failed"] } },
    data: {
      status: "running",
      attempt: { increment: 1 },
      error: null,
    },
  });
  if (claimed.count === 0) {
    // Already running or completed by another process
    if (step.status !== "running") {
      return null;
    }
    // Wait briefly for another worker to finish, then refetch
    await new Promise((r) => setTimeout(r, 1000));
    const refreshed = await prisma.aiWorkflowStep.findUnique({ where: { id: step.id } });
    return refreshed?.output ? JSON.parse(refreshed.output) : null;
  }

  const startedAt = Date.now();
  try {
    const output = await runStepLogic(stepName, articleId, runId);
    const enriched = enrichStepOutput(output, contentHash);
    await prisma.aiWorkflowStep.update({
      where: { id: step.id },
      data: {
        status: isSkippedOutput(enriched) ? "skipped" : "completed",
        output: JSON.stringify(enriched || {}),
        durationMs: Date.now() - startedAt,
        error: null,
      },
    });
    await updateRunProgress(runId);

    // Save artifacts for versioned AI outputs
    if (stepId && enriched) {
      await saveStepArtifacts(runId, stepId, articleId, stepName, enriched);
    }

    return enriched;
  } catch (error) {
    const message = error instanceof Error ? error.message : "步骤执行失败";
    const nextStatus = step.attempt + 1 >= step.maxAttempts ? "failed" : "queued";
    await prisma.aiWorkflowStep.update({
      where: { id: step.id },
      data: {
        status: nextStatus,
        error: message,
        durationMs: Date.now() - startedAt,
      },
    });
    await updateRunProgress(runId);
    if (nextStatus === "failed") throw error;
    return null;
  }
}

async function saveStepArtifacts(
  runId: string,
  stepId: string,
  articleId: string,
  stepName: AiWorkflowStepName,
  output: unknown
) {
  try {
    switch (stepName) {
      case "article.unified-calibration": {
        const result = output as {
          annotations?: unknown[];
          translation?: string;
          appreciation?: string;
          pinyin?: { data?: unknown; summary?: string; correctionCount?: number; uncertainCount?: number };
          aiMeta?: { providerName?: string; providerModel?: string; promptVersion?: string; durationMs?: number };
        };
        if (result.annotations) {
          await saveArtifact({
            runId, stepId, articleId, type: "annotations",
            content: result.annotations,
            provider: result.aiMeta?.providerName,
            model: result.aiMeta?.providerModel,
            promptVersion: result.aiMeta?.promptVersion,
          });
        }
        if (result.translation) {
          await saveArtifact({
            runId, stepId, articleId, type: "translation",
            content: result.translation,
            provider: result.aiMeta?.providerName,
            model: result.aiMeta?.providerModel,
            promptVersion: result.aiMeta?.promptVersion,
          });
        }
        if (result.appreciation) {
          await saveArtifact({
            runId, stepId, articleId, type: "appreciation",
            content: result.appreciation,
            provider: result.aiMeta?.providerName,
            model: result.aiMeta?.providerModel,
            promptVersion: result.aiMeta?.promptVersion,
          });
        }
        if (result.pinyin?.data) {
          await saveArtifact({
            runId, stepId, articleId, type: "pinyin",
            content: result.pinyin,
            provider: result.aiMeta?.providerName,
            model: result.aiMeta?.providerModel,
            promptVersion: result.aiMeta?.promptVersion,
          });
        }
        break;
      }

      case "format.analyze": {
        const result = output as { data?: unknown; cached?: boolean };
        if (result.data) {
          await saveArtifact({
            runId, stepId, articleId, type: "format",
            content: result.data,
          });
        }
        break;
      }

      case "article.review": {
        const result = output as ReviewReport;
        await saveArtifact({
          runId, stepId, articleId, type: "review",
          content: result,
          confidence: typeof result.score === "number" ? result.score / 100 : undefined,
          promptVersion: result.source?.promptVersion,
        });
        break;
      }

      case "painting.recommend": {
        const result = output as { candidates?: unknown[]; analysis?: unknown };
        if (result.candidates) {
          await saveArtifact({
            runId, stepId, articleId, type: "painting",
            content: result,
          });
        }
        break;
      }
    }
  } catch (err) {
    console.warn(`[artifact] Failed to save artifact for step ${stepName}:`, err);
  }
}

async function saveStepDecision(
  runId: string,
  articleId: string,
  stepName: string,
  decision: "ready" | "review" | "failed" | "skipped",
  confidence?: number,
  reasons?: string[]
) {
  try {
    await saveDecision({ runId, articleId, stepName, decision, confidence, reasons });
  } catch (err) {
    console.warn(`[decision] Failed to save decision for step ${stepName}:`, err);
  }
}

async function skipStep(stepId: string, reason = "去重阻断") {
  await prisma.aiWorkflowStep.update({
    where: { id: stepId },
    data: {
      status: "skipped",
      output: JSON.stringify({ skipped: true, reason }),
    },
  });
}

async function runStepLogic(stepName: AiWorkflowStepName, articleId: string, runId?: string) {
  switch (stepName) {
    case "parse.normalize":
      return normalizeArticle(articleId);
    case "dedupe.check":
      return checkDuplicate(articleId);
    case "article.unified-calibration":
      return runCalibrationStep(runId || "", articleId);
    case "format.analyze":
      return getOrCreateFormatAnalysis(articleId);
    case "article.review":
      return generateReviewReport(articleId);
    case "painting.recommend":
      return runPaintingRecommend(articleId);
    case "decision.route":
      return routeArticleDecision(articleId);
  }
}

async function runCalibrationStep(runId: string, articleId: string) {
  if (runId) {
    const run = await prisma.aiWorkflowRun.findUnique({
      where: { id: runId },
      select: { policy: true },
    });
    if (run?.policy === "parallel") {
      return runParallelExperts(articleId);
    }
  }
  return runUnifiedCalibration(articleId);
}

// ============================================================================
// 3. Zombie Recovery
// ============================================================================

async function recoverZombieSteps() {
  const threshold = new Date(Date.now() - ZOMBIE_STEP_THRESHOLD_MS);
  const zombies = await prisma.aiWorkflowStep.findMany({
    where: {
      status: "running",
      updatedAt: { lt: threshold },
    },
  });

  if (zombies.length === 0) return;

  console.log(`[zombie-recovery] Found ${zombies.length} zombie steps, recovering...`);

  for (const step of zombies) {
    const nextStatus = step.attempt >= step.maxAttempts ? "failed" : "queued";
    await prisma.aiWorkflowStep.update({
      where: { id: step.id },
      data: {
        status: nextStatus,
        error: step.error || "步骤因超时未响应，已自动恢复",
      },
    });
    console.log(`[zombie-recovery] Step ${step.id} (${step.name}) reset to ${nextStatus}`);
  }
}

async function recoverZombieRuns() {
  const threshold = new Date(Date.now() - ZOMBIE_RUN_THRESHOLD_MS);
  const zombies = await prisma.aiWorkflowRun.findMany({
    where: {
      status: "running",
      updatedAt: { lt: threshold },
    },
    include: { steps: true },
  });

  if (zombies.length === 0) return;

  console.log(`[zombie-recovery] Found ${zombies.length} zombie runs, recovering...`);

  for (const run of zombies) {
    // Check if any steps are still running (should have been recovered above)
    const stillRunning = run.steps.some((s) => s.status === "running");
    if (stillRunning) continue; // Will be handled in next cycle after step recovery

    const failedSteps = run.steps.filter((s) => s.status === "failed").length;
    const newStatus = failedSteps > 0 ? "failed" : "queued";

    await prisma.aiWorkflowRun.update({
      where: { id: run.id },
      data: {
        status: newStatus,
        error: newStatus === "failed" ? "任务因超时未完成，已自动标记为失败" : null,
        lockedUntil: null,
        workerId: null,
      },
    });

    if (run.articleId) {
      await prisma.article.update({
        where: { id: run.articleId },
        data: {
          aiStatus: newStatus === "failed" ? "failed" : "queued",
          aiUpdatedAt: new Date(),
        },
      });
    }

    console.log(`[zombie-recovery] Run ${run.id} reset to ${newStatus}`);
  }
}

// ============================================================================
// 4. Step Logic
// ============================================================================

async function normalizeArticle(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, body: true, type: true, tagList: true },
  });
  if (!article) throw new Error("文章不存在");

  // Safety check: input size
  if (article.body.length > MAX_INPUT_LENGTH) {
    console.warn(`[normalize] Article ${articleId} body exceeds ${MAX_INPUT_LENGTH} chars, truncating metadata`);
  }

  const title = article.title.trim();
  const body = article.body
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  const changed = title !== article.title || body !== article.body;
  if (changed) {
    await prisma.article.update({
      where: { id: articleId },
      data: { title, body, aiUpdatedAt: new Date() },
    });
  }

  const fingerprint = await persistArticleFingerprint(articleId);
  void persistArticleEmbedding(articleId).catch(() => {});

  return { changed, title, type: article.type, contentFingerprint: fingerprint };
}

async function runPaintingRecommend(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, body: true, tagList: true, paintingId: true },
  });
  if (!article) throw new Error("文章不存在");
  if (article.paintingId) {
    return { skipped: true, reason: "已绑定配图" };
  }

  let tags: string[] = [];
  try {
    tags = JSON.parse(article.tagList || "[]");
  } catch {
    tags = [];
  }

  const result = await recommendPaintingsForPoem({
    title: article.title,
    body: article.body,
    tags,
    count: 4,
  });

  return {
    candidates: result.matches,
    analysis: result.analysis,
    mode: result.mode,
    total: result.total,
  };
}

async function checkDuplicate(articleId: string) {
  const result = await checkArticleDuplicate(articleId);

  if (result.duplicate && result.id && result.similarity != null && result.type) {
    await prisma.article.update({
      where: { id: articleId },
      data: {
        aiStatus: "review",
        aiRiskLevel: result.type === "exact" ? "high" : "medium",
        aiUpdatedAt: new Date(),
      },
    });
    return {
      duplicate: true,
      id: result.id,
      title: result.title,
      similarity: result.similarity,
      type: result.type,
    };
  }

  return { duplicate: false };
}

async function generateReviewReport(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      author: true,
      source: true,
      type: true,
      status: true,
      dateRaw: true,
      preface: true,
      body: true,
      postscript: true,
      notes: true,
      annotations: true,
      translation: true,
      appreciation: true,
    },
  });
  if (!article) throw new Error("文章不存在");

  // Safety: XSS prevention on all AI-generated content before storing
  const sanitizeForXss = (str: string | null) => {
    if (!str) return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, "");
  };

  const promptVersion = resolvePromptVersion("article.review", articleId);
  const runtimeOptions = getPromptRuntimeOptions(promptVersion);

  const aiResult = await runAiTask(
    "article.review",
    [
      {
        role: "system",
        content: "你是一位谨严而有审美判断力的中文文学编辑，熟悉古典诗文、现代诗文、注释、译文与赏析校审。你只基于用户提供内容判断，不凭空补充事实。你只输出严格 JSON，不输出 Markdown。",
      },
      {
        role: "user",
        content: buildReviewPrompt(article),
      },
    ],
    articleReviewSchema,
    {
      promptVersion,
      temperature: runtimeOptions.temperature ?? 0.2,
      maxTokens: runtimeOptions.maxTokens ?? 2200,
    }
  );

  const report: ReviewReport = {
    ...normalizeReport(aiResult.data),
    generatedAt: new Date().toISOString(),
    source: {
      provider: "configured-llm",
      promptVersion,
    },
  };

  await prisma.article.update({
    where: { id: articleId },
    data: {
      reviewReport: sanitizeForXss(JSON.stringify(report)),
      status: article.status === "published" ? "published" : "review",
      aiUpdatedAt: new Date(),
    },
  });

  const contentHash = computeArticleContentHash(article);
  return { ...report, contentHash };
}

async function routeArticleDecision(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      body: true,
      annotations: true,
      pinyin: true,
      confidence: true,
      reviewReport: true,
    },
  });
  if (!article) throw new Error("文章不存在");

  const review = parseJson(article.reviewReport) as { overall?: string; score?: number; issues?: Array<{ severity?: string }> } | null;
  const pinyin = parseJson(article.pinyin) as { calibration?: { uncertain?: unknown[] } } | null;
  const annotations = parseJson(article.annotations);
  const annotationCount = Array.isArray(annotations) ? annotations.length : 0;
  const uncertainCount = Array.isArray(pinyin?.calibration?.uncertain) ? pinyin.calibration.uncertain.length : 0;
  const highIssueCount = Array.isArray(review?.issues)
    ? review.issues.filter((issue) => issue.severity === "high").length
    : 0;
  const reviewScore = typeof review?.score === "number" ? review.score : 70;

  let aiStatus = "ready";
  let aiRiskLevel = "low";
  const reasons: string[] = [];

  if (review?.overall === "risk" || highIssueCount > 0) {
    aiStatus = "review";
    aiRiskLevel = "high";
    reasons.push("校审报告存在高风险问题");
  }
  if (uncertainCount > 0) {
    aiStatus = "review";
    aiRiskLevel = aiRiskLevel === "high" ? "high" : "medium";
    reasons.push(`拼音存在 ${uncertainCount} 项待复核`);
  }
  if (article.body.length > 80 && annotationCount < 1) {
    aiStatus = "review";
    aiRiskLevel = aiRiskLevel === "high" ? "high" : "medium";
    reasons.push("长文缺少有效注释");
  }
  if (reviewScore < 75) {
    aiStatus = "review";
    aiRiskLevel = aiRiskLevel === "high" ? "high" : "medium";
    reasons.push(`校审评分 ${reviewScore}，低于自动通过线`);
  }

  const confidence = estimateArticleConfidence({
    base: article.confidence,
    reviewScore,
    annotationCount,
    uncertainCount,
    highIssueCount,
  });

  await prisma.article.update({
    where: { id: articleId },
    data: {
      aiStatus,
      aiConfidence: confidence,
      aiRiskLevel,
      aiUpdatedAt: new Date(),
    },
  });

  // Save decision artifact for audit trail
  const latestRun = await prisma.aiWorkflowRun.findFirst({
    where: { articleId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (latestRun) {
    await saveStepDecision(
      latestRun.id,
      articleId,
      "decision.route",
      aiStatus as "ready" | "review" | "failed",
      confidence,
      reasons
    );
  }

  return { aiStatus, aiConfidence: confidence, aiRiskLevel, reasons };
}

// ============================================================================
// 5. Retry & Progress
// ============================================================================

export async function retryWorkflow(runId: string) {
  const run = await prisma.aiWorkflowRun.findUnique({
    where: { id: runId },
    select: { id: true, articleId: true },
  });
  if (!run) throw new Error("任务不存在");

  await prisma.$transaction([
    prisma.aiWorkflowStep.updateMany({
      where: { runId, status: "failed" },
      data: {
        status: "queued",
        error: null,
      },
    }),
    prisma.aiWorkflowRun.update({
      where: { id: runId },
      data: {
        status: "queued",
        error: null,
        completedAt: null,
      },
    }),
    ...(run.articleId ? [
      prisma.article.update({
        where: { id: run.articleId },
        data: { aiStatus: "queued", aiUpdatedAt: new Date() },
      }),
    ] : []),
  ]);

  return prisma.aiWorkflowRun.findUnique({
    where: { id: runId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
}

export async function getWorkflowSummary(batchId?: string | null) {
  const where = batchId ? { batchId } : {};
  const runs = await prisma.aiWorkflowRun.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: batchId ? 500 : 100,
    include: {
      steps: { orderBy: { order: "asc" } },
    },
  });

  const counts = runs.reduce<Record<string, number>>((acc, run) => {
    acc[run.status] = (acc[run.status] || 0) + 1;
    return acc;
  }, {});

  return {
    runs,
    total: runs.length,
    counts,
    progress: aggregateProgress(runs),
  };
}

async function updateRunProgress(runId: string) {
  const steps = await prisma.aiWorkflowStep.findMany({
    where: { runId },
    select: { status: true },
  });
  const done = steps.filter((step) => step.status === "completed" || step.status === "skipped").length;
  const progress = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;
  await prisma.aiWorkflowRun.update({
    where: { id: runId },
    data: { progress },
  });
}

function aggregateProgress(runs: Array<{ progress: number }>) {
  if (runs.length === 0) return 0;
  return Math.round(runs.reduce((sum, run) => sum + run.progress, 0) / runs.length);
}

// ============================================================================
// 6. Utilities
// ============================================================================

function buildReviewPrompt(article: {
  title: string;
  author: string;
  source: string;
  type: string;
  dateRaw: string | null;
  preface: string | null;
  body: string;
  postscript: string | null;
  notes: string | null;
  annotations: string | null;
  translation: string | null;
  appreciation: string | null;
}) {
  return `请校审以下文章。重点检查：错字、断句、诗体换行、注释是否过度或失准、译文是否偏离原意、赏析是否空泛、格律或文体风险、事实与典故风险、发布前是否还需人工复核。

必须只返回如下 JSON 结构：
{
  "overall": "pass | review | risk",
  "score": 0-100,
  "summary": "不超过80字的总体判断",
  "issues": [
    {
      "category": "错字 | 断句 | 注释 | 译文 | 赏析 | 格律 | 事实 | 风格",
      "severity": "low | medium | high",
      "target": "问题所在的短语或字段",
      "detail": "问题说明",
      "suggestion": "修改建议",
      "field": "title | author | type | dateRaw | preface | body | postscript | notes | annotations | translation | appreciation",
      "original": "可在对应字段中精确匹配的原片段",
      "replacement": "用于替换 original 的新片段"
    }
  ],
  "strengths": ["值得保留的优点"],
  "publishAdvice": "发布前建议"
}

可直接修改的问题必须填写 field、original、replacement，且 original 必须逐字出现在对应字段中；仅需人工判断或缺少证据的问题请省略 field，并将 original、replacement 留空。

【元信息】
标题：${article.title}
作者：${article.author}
来源：${article.source}
类型：${article.type}
日期/朝代：${article.dateRaw || "未填"}

【序】
${article.preface || "无"}

【正文】
${article.body}

【跋】
${article.postscript || "无"}

【备注】
${article.notes || "无"}

【注释 JSON】
${article.annotations || "无"}

【译文】
${article.translation || "无"}

【赏析】
${article.appreciation || "无"}`;
}

function normalizeReport(raw: unknown): Omit<ReviewReport, "generatedAt" | "source"> {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const overall = data.overall === "pass" || data.overall === "risk" ? data.overall : "review";
  const score = typeof data.score === "number" && Number.isFinite(data.score)
    ? Math.max(0, Math.min(100, Math.round(data.score)))
    : 70;
  const issues = Array.isArray(data.issues)
    ? data.issues.map(normalizeIssue).filter((item): item is ReviewIssue => item !== null).slice(0, 12)
    : [];
  const strengths = Array.isArray(data.strengths)
    ? data.strengths.filter((item): item is string => typeof item === "string").slice(0, 6)
    : [];

  return {
    overall,
    score,
    summary: typeof data.summary === "string" ? data.summary : "AI 已完成基础校审，请人工复核重点问题。",
    issues,
    strengths,
    publishAdvice: typeof data.publishAdvice === "string" ? data.publishAdvice : "建议人工通读后再发布。",
  };
}

function normalizeIssue(raw: unknown): ReviewIssue | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const severity = data.severity === "high" || data.severity === "low" ? data.severity : "medium";

  return {
    category: typeof data.category === "string" ? data.category : "校审",
    severity,
    target: typeof data.target === "string" ? data.target : "",
    detail: typeof data.detail === "string" ? data.detail : "",
    suggestion: typeof data.suggestion === "string" ? data.suggestion : "",
    field: typeof data.field === "string" ? data.field : undefined,
    original: typeof data.original === "string" ? data.original : "",
    replacement: typeof data.replacement === "string" ? data.replacement : "",
  };
}

function estimateArticleConfidence(input: {
  base: number | null;
  reviewScore: number;
  annotationCount: number;
  uncertainCount: number;
  highIssueCount: number;
}) {
  const base = typeof input.base === "number" ? input.base : 0.65;
  const reviewPart = input.reviewScore / 100;
  const annotationPart = input.annotationCount >= 3 ? 0.85 : input.annotationCount > 0 ? 0.72 : 0.45;
  const penalty = Math.min(0.3, input.uncertainCount * 0.05 + input.highIssueCount * 0.12);
  return Math.max(0.1, Math.min(0.98, Number(((base + reviewPart + annotationPart) / 3 - penalty).toFixed(2))));
}

function parseJson(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function enrichStepOutput(output: unknown, contentHash?: string) {
  if (!contentHash || !output || typeof output !== "object") return output;
  return { ...(output as Record<string, unknown>), contentHash };
}

function isSkippedOutput(output: unknown): output is { skipped: true } {
  return Boolean(output && typeof output === "object" && "skipped" in output && (output as { skipped?: unknown }).skipped === true);
}
