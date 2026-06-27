import { prisma } from "@/lib/prisma";

// ============================================================================
// AiArtifact: Versioned AI outputs for each workflow step
// ============================================================================

export type ArtifactType =
  | "annotations"
  | "translation"
  | "appreciation"
  | "pinyin"
  | "review"
  | "format";

interface SaveArtifactInput {
  runId: string;
  stepId?: string;
  articleId: string;
  type: ArtifactType;
  content: unknown;
  confidence?: number;
  provider?: string;
  model?: string;
  promptVersion?: string;
}

export async function saveArtifact(input: SaveArtifactInput) {
  const existingCount = await prisma.aiArtifact.count({
    where: { articleId: input.articleId, type: input.type },
  });

  const artifact = await prisma.aiArtifact.create({
    data: {
      runId: input.runId,
      stepId: input.stepId,
      articleId: input.articleId,
      type: input.type,
      version: existingCount + 1,
      content: JSON.stringify(input.content),
      confidence: input.confidence,
      provider: input.provider,
      model: input.model,
      promptVersion: input.promptVersion,
    },
  });

  return artifact;
}

export async function getLatestArtifact(articleId: string, type: ArtifactType) {
  return prisma.aiArtifact.findFirst({
    where: { articleId, type },
    orderBy: { version: "desc" },
  });
}

export async function getArtifactHistory(articleId: string, type: ArtifactType) {
  return prisma.aiArtifact.findMany({
    where: { articleId, type },
    orderBy: { version: "desc" },
  });
}

export async function getRunArtifacts(runId: string) {
  return prisma.aiArtifact.findMany({
    where: { runId },
    orderBy: { createdAt: "asc" },
  });
}

export async function compareArtifacts(
  articleId: string,
  type: ArtifactType,
  versionA: number,
  versionB: number
) {
  const [a, b] = await Promise.all([
    prisma.aiArtifact.findFirst({ where: { articleId, type, version: versionA } }),
    prisma.aiArtifact.findFirst({ where: { articleId, type, version: versionB } }),
  ]);
  return { a, b };
}

// ============================================================================
// AiDecision: Decision tracking for each step and final routing
// ============================================================================

export type DecisionType = "ready" | "review" | "failed" | "skipped";

interface SaveDecisionInput {
  runId: string;
  articleId: string;
  stepName: string;
  decision: DecisionType;
  confidence?: number;
  reasons?: string[];
}

export async function saveDecision(input: SaveDecisionInput) {
  const decision = await prisma.aiDecision.create({
    data: {
      runId: input.runId,
      articleId: input.articleId,
      stepName: input.stepName,
      decision: input.decision,
      confidence: input.confidence,
      reasons: input.reasons ? JSON.stringify(input.reasons) : null,
    },
  });

  return decision;
}

export async function getDecisionsForArticle(articleId: string) {
  return prisma.aiDecision.findMany({
    where: { articleId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestDecision(articleId: string, stepName?: string) {
  return prisma.aiDecision.findFirst({
    where: stepName ? { articleId, stepName } : { articleId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDecisionStats() {
  const decisions = await prisma.aiDecision.groupBy({
    by: ["decision"],
    _count: { decision: true },
  });

  return decisions.reduce<Record<string, number>>((acc, item) => {
    acc[item.decision] = item._count.decision;
    return acc;
  }, {});
}

// ============================================================================
// AiFeedback: Human feedback on AI artifacts
// ============================================================================

export type FeedbackAction = "adopt" | "reject" | "modify";

interface SaveFeedbackInput {
  artifactId?: string;
  runId: string;
  articleId: string;
  action: FeedbackAction;
  reason?: string;
  contentBefore?: string;
  contentAfter?: string;
}

export async function saveFeedback(input: SaveFeedbackInput) {
  const feedback = await prisma.aiFeedback.create({
    data: {
      artifactId: input.artifactId || null,
      runId: input.runId,
      articleId: input.articleId,
      action: input.action,
      reason: input.reason,
      contentBefore: input.contentBefore,
      contentAfter: input.contentAfter,
    },
  });

  return feedback;
}

export async function getFeedbackForArticle(articleId: string) {
  return prisma.aiFeedback.findMany({
    where: { articleId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFeedbackStats() {
  const feedback = await prisma.aiFeedback.groupBy({
    by: ["action"],
    _count: { action: true },
  });

  return feedback.reduce<Record<string, number>>((acc, item) => {
    acc[item.action] = item._count.action;
    return acc;
  }, {});
}

// ============================================================================
// Convenience: Get full AI pipeline state for an article
// ============================================================================

export async function getArticleAiState(articleId: string) {
  const [article, latestRun, artifacts, decisions, feedback] = await Promise.all([
    prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true, title: true, aiStatus: true, aiConfidence: true,
        aiRiskLevel: true, aiUpdatedAt: true,
      },
    }),
    prisma.aiWorkflowRun.findFirst({
      where: { articleId },
      orderBy: { createdAt: "desc" },
      include: { steps: { orderBy: { order: "asc" } } },
    }),
    prisma.aiArtifact.findMany({
      where: { articleId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.aiDecision.findMany({
      where: { articleId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.aiFeedback.findMany({
      where: { articleId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return { article, latestRun, artifacts, decisions, feedback };
}
