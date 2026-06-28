import type { LlmCallOptions } from "@/lib/llm-service";

export type AiTaskTier = "fast" | "standard" | "quality";

/** 任务名 → 调度层级（快模型 / 常规模型 / 强模型） */
const TASK_TIER_MAP: Record<string, AiTaskTier> = {
  "parse.normalize": "fast",
  "dedupe.check": "fast",
  "jigu.source.extract": "standard",
  "xianyin.parse": "standard",
  "xianyin.write.generate": "quality",
  "xianyin.write.rewrite": "quality",
  "xianyin.write.expand": "quality",
  "xianyin.write.continue": "quality",
  "xianyin.write.polish": "quality",
  "xianyin.write.tuijiao": "quality",
  "article.assist": "standard",
  "article.assist.batch": "standard",
  "article.unified-calibration": "standard",
  "article.pinyin.calibration": "standard",
  "article.format": "fast",
  "article.review": "quality",
  "article.dedup.decision": "fast",
  "daily-quote.generate": "quality",
};

const TIER_MODEL_PATTERNS: Record<AiTaskTier, RegExp[]> = {
  fast: [/flash/i, /lite/i, /mini/i],
  standard: [/flash/i, /pro/i, /glm/i, /doubao/i, /minimax/i],
  quality: [/pro/i, /sonnet/i, /opus/i, /M2\.7/i],
};

export function resolveTaskTier(taskName: string): AiTaskTier {
  if (TASK_TIER_MAP[taskName]) return TASK_TIER_MAP[taskName];

  if (taskName.startsWith("xianyin.write.")) return "quality";
  if (taskName.includes("review")) return "quality";
  if (taskName.includes("format") || taskName.includes("dedup")) return "fast";

  return "standard";
}

export function getLlmOptionsForTier(tier: AiTaskTier): Pick<LlmCallOptions, "maxProviders" | "preferModelPatterns"> {
  switch (tier) {
    case "fast":
      return { maxProviders: 1, preferModelPatterns: TIER_MODEL_PATTERNS.fast };
    case "quality":
      return { maxProviders: 2, preferModelPatterns: TIER_MODEL_PATTERNS.quality };
    default:
      return { maxProviders: 2, preferModelPatterns: TIER_MODEL_PATTERNS.standard };
  }
}

export function resolveLlmOptionsForTask(
  taskName: string,
  overrides: LlmCallOptions = {}
): LlmCallOptions {
  const tier = resolveTaskTier(taskName);
  const tierOptions = getLlmOptionsForTier(tier);
  return { ...tierOptions, ...overrides };
}
