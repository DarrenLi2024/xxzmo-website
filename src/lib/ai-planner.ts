import { prisma } from "@/lib/prisma";
import { computeArticleContentHash, parseStepOutput } from "@/lib/ai-content-hash";
import type { AiWorkflowStepName } from "@/lib/ai-workflow-types";
import { PAINTING_POLICIES } from "@/lib/ai-workflow-types";

export type PipelineTier = "minimal" | "standard" | "full";

export interface PipelinePlan {
  tier: PipelineTier;
  skipSteps: AiWorkflowStepName[];
  skipReasons: Partial<Record<AiWorkflowStepName, string>>;
  contentHash: string;
}

const FORMAT_SKIP_TYPES = new Set(["对联", "随笔", "日记"]);

/**
 * Planner：只决定跑哪些步骤，不生成内容。
 * 在 executeRun 开始时调用，跳过的步骤标记为 skipped 并记录原因。
 */
export async function planArticlePipeline(
  articleId: string,
  policy = "standard"
): Promise<PipelinePlan> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      type: true,
      body: true,
      preface: true,
      postscript: true,
      annotations: true,
      translation: true,
      appreciation: true,
      pinyin: true,
      formatAnalysis: true,
      reviewReport: true,
      confidence: true,
      paintingId: true,
    },
  });

  if (!article) {
    throw new Error("文章不存在");
  }

  const contentHash = computeArticleContentHash(article);
  const skipSteps: AiWorkflowStepName[] = [];
  const skipReasons: Partial<Record<AiWorkflowStepName, string>> = {};

  // 体裁策略：对联/随笔/日记跳过格律分析
  if (FORMAT_SKIP_TYPES.has(article.type)) {
    skipSteps.push("format.analyze");
    skipReasons["format.analyze"] = `${article.type} 体裁跳过格式分析`;
  }

  // 内容未变且已有完整校准产物 → 跳过统一校准
  if (await shouldSkipUnifiedCalibration(articleId, contentHash, article)) {
    skipSteps.push("article.unified-calibration");
    skipReasons["article.unified-calibration"] = "正文未变更，复用已有注释/拼音";
  }

  // 格式分析：仅当上次步骤输出指纹与当前正文一致时跳过
  if (!skipSteps.includes("format.analyze")) {
    const cached = parseStepOutput<{ contentHash?: string }>(
      await getLatestStepOutput(articleId, "format.analyze")
    );
    if (cached?.contentHash === contentHash && article.formatAnalysis) {
      skipSteps.push("format.analyze");
      skipReasons["format.analyze"] = "格式分析结果仍有效";
    }
  }

  // 校审报告已有且正文未变
  if (article.reviewReport) {
    const cached = parseStepOutput<{ contentHash?: string }>(
      await getLatestStepOutput(articleId, "article.review")
    );
    if (cached?.contentHash === contentHash) {
      skipSteps.push("article.review");
      skipReasons["article.review"] = "校审报告仍有效，跳过重新生成";
    }
  }

  // 批量模式跳过 LLM 校审，由 decision.route 做最终路由（提速）
  if (policy === "batch-unified") {
    skipSteps.push("article.review");
    skipReasons["article.review"] = "批量模式跳过校审，由路由决策";
  }

  // 配图推荐：仅 full / with-painting policy，且未绑定配图
  if (!PAINTING_POLICIES.has(policy) || article.paintingId) {
    skipSteps.push("painting.recommend");
    skipReasons["painting.recommend"] = article.paintingId
      ? "文章已绑定配图"
      : "policy 未启用配图推荐";
  }

  const tier: PipelineTier =
    skipSteps.length >= 3 ? "minimal" :
    skipSteps.length >= 1 ? "standard" : "full";

  return { tier, skipSteps, skipReasons, contentHash };
}

async function shouldSkipUnifiedCalibration(
  articleId: string,
  contentHash: string,
  article: {
    annotations: string | null;
    pinyin: string | null;
    translation: string | null;
  }
): Promise<boolean> {
  if (!article.annotations || !article.pinyin) return false;

  const latestOutput = await getLatestStepOutput(articleId, "article.unified-calibration");
  const cached = parseStepOutput<{ contentHash?: string; cached?: boolean }>(latestOutput);
  return cached?.contentHash === contentHash;
}

async function getLatestStepOutput(articleId: string, stepName: string): Promise<string | null> {
  const step = await prisma.aiWorkflowStep.findFirst({
    where: {
      name: stepName,
      status: { in: ["completed", "skipped"] },
      run: { articleId },
    },
    orderBy: { updatedAt: "desc" },
    select: { output: true },
  });
  return step?.output ?? null;
}
