import type { LlmCallOptions } from "@/lib/llm-service";

export type AiTaskTier = "fast" | "standard" | "quality";

/** 任务名 → 调度层级（快模型 / 常规模型 / 强模型） */
const TASK_TIER_MAP: Record<string, AiTaskTier> = {
  "parse.normalize": "fast",
  "dedupe.check": "fast",
  "jigu.source.extract": "fast",
  "xianyin.parse": "fast",
  "xianyin.write.generate": "standard",
  "xianyin.write.rewrite": "standard",
  "xianyin.write.expand": "standard",
  "xianyin.write.continue": "standard",
  "xianyin.write.polish": "standard",
  "xianyin.write.tuijiao": "standard",
  "article.assist": "standard",
  "article.assist.batch": "standard",
  "article.unified-calibration": "fast",
  "article.expert.literary": "standard",
  "article.pinyin.calibration": "fast",
  "article.format": "fast",
  "article.review": "quality",
  "article.dedup.decision": "fast",
  "daily-quote.generate": "standard",
  "painting.match": "fast",
};

/** 人在等的交互 API：只走 priority 最高的一个 Provider，减少 failover 等待 */
const INTERACTIVE_TASK_PREFIXES = [
  "xianyin.",
  "jigu.",
];

const TIER_MODEL_PATTERNS: Record<AiTaskTier, RegExp[]> = {
  fast: [/flash/i, /lite/i, /mini/i],
  standard: [/flash/i, /pro/i, /glm/i, /doubao/i, /minimax/i],
  quality: [/pro/i, /sonnet/i, /opus/i, /M2\.7/i],
};

export function resolveTaskTier(taskName: string): AiTaskTier {
  if (TASK_TIER_MAP[taskName]) return TASK_TIER_MAP[taskName];

  if (taskName.startsWith("xianyin.write.")) return "standard";
  if (taskName.includes("review")) return "quality";
  if (taskName.includes("format") || taskName.includes("dedup")) return "fast";

  return "standard";
}

export function isInteractiveTask(taskName: string): boolean {
  return INTERACTIVE_TASK_PREFIXES.some((prefix) => taskName.startsWith(prefix));
}

export function getLlmOptionsForTier(tier: AiTaskTier): Pick<LlmCallOptions, "maxProviders" | "preferModelPatterns"> {
  switch (tier) {
    case "fast":
      return { maxProviders: 1, preferModelPatterns: TIER_MODEL_PATTERNS.fast };
    case "quality":
      return { maxProviders: 2, preferModelPatterns: TIER_MODEL_PATTERNS.quality };
    default:
      return { maxProviders: 1, preferModelPatterns: TIER_MODEL_PATTERNS.standard };
  }
}

export function resolveLlmOptionsForTask(
  taskName: string,
  overrides: LlmCallOptions = {}
): LlmCallOptions {
  const tier = resolveTaskTier(taskName);
  const tierOptions = getLlmOptionsForTier(tier);
  const interactive = isInteractiveTask(taskName);

  return {
    ...tierOptions,
    ...(interactive ? { maxProviders: 1, maxRetries: 1 } : {}),
    ...overrides,
  };
}
