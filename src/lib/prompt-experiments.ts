import { experimentBucket } from "@/lib/ai-embedding";

export interface PromptVariant {
  version: string;
  weight: number;
  label?: string;
}

export interface PromptExperiment {
  taskName: string;
  variants: PromptVariant[];
  enabled: boolean;
}

/** 已注册的 Prompt A/B 实验 */
export const PROMPT_EXPERIMENTS: PromptExperiment[] = [
  {
    taskName: "article.unified-calibration",
    enabled: true,
    variants: [
      { version: "unified-assist-v1", weight: 70, label: "统一校准 v1（主）" },
      { version: "unified-assist-v1-fast", weight: 30, label: "统一校准 v1（低温）" },
    ],
  },
  {
    taskName: "article.review",
    enabled: true,
    variants: [
      { version: "article-review-v3", weight: 50, label: "校审 v3" },
      { version: "article-review-v3-strict", weight: 50, label: "校审 v3 严格" },
    ],
  },
  {
    taskName: "article.expert.literary",
    enabled: true,
    variants: [
      { version: "article-assist-v2", weight: 100, label: "文学 Expert v2" },
    ],
  },
];

const TASK_DEFAULT_VERSIONS: Record<string, string> = {
  "article.unified-calibration": "unified-assist-v1",
  "article.review": "article-review-v3",
  "article.expert.literary": "article-assist-v2",
  "article.pinyin.calibration": "pinyin-calibration-v1",
  "painting.match": "painting-match-v2",
};

/** 温度等参数随 prompt 版本微调 */
export function getPromptRuntimeOptions(promptVersion: string): {
  temperature?: number;
  maxTokens?: number;
} {
  switch (promptVersion) {
    case "unified-assist-v1-fast":
      return { temperature: 0.15, maxTokens: 6144 };
    case "article-review-v1-strict":
    case "article-review-v3-strict":
      return { temperature: 0.1, maxTokens: 2400 };
    default:
      return {};
  }
}

export function getExperimentForTask(taskName: string): PromptExperiment | undefined {
  return PROMPT_EXPERIMENTS.find((item) => item.taskName === taskName && item.enabled);
}

/** 基于文章 ID 确定性选择 prompt 版本 */
export function resolvePromptVersion(taskName: string, seed: string): string {
  const experiment = getExperimentForTask(taskName);
  if (!experiment || experiment.variants.length === 0) {
    return TASK_DEFAULT_VERSIONS[taskName] || "default-v1";
  }

  if (experiment.variants.length === 1) {
    return experiment.variants[0].version;
  }

  const bucket = experimentBucket(seed, taskName);
  let acc = 0;
  for (const variant of experiment.variants) {
    acc += variant.weight;
    if (bucket < acc) return variant.version;
  }

  return experiment.variants[experiment.variants.length - 1].version;
}

export interface PromptAbComparison {
  taskName: string;
  variants: Array<{
    promptVersion: string;
    label: string;
    total: number;
    successRate: number;
    avgDurationMs: number;
    reviewRate?: number;
  }>;
  winner: string | null;
}

/** 从 AiTaskLog 统计中推断 A/B 优胜版本 */
export function comparePromptVariants(
  taskName: string,
  stats: Array<{
    taskName: string;
    promptVersion: string;
    total: number;
    successRate: number;
    avgDurationMs: number;
  }>
): PromptAbComparison | null {
  const experiment = getExperimentForTask(taskName);
  if (!experiment) return null;

  const rows = stats.filter((item) => item.taskName === taskName);
  if (rows.length === 0) return null;

  const variants = experiment.variants.map((variant) => {
    const stat = rows.find((row) => row.promptVersion === variant.version);
    return {
      promptVersion: variant.version,
      label: variant.label || variant.version,
      total: stat?.total ?? 0,
      successRate: stat?.successRate ?? 0,
      avgDurationMs: stat?.avgDurationMs ?? 0,
    };
  }).filter((item) => item.total > 0);

  if (variants.length === 0) return null;

  const winner = [...variants].sort((a, b) => {
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    return a.avgDurationMs - b.avgDurationMs;
  })[0]?.promptVersion ?? null;

  return { taskName, variants, winner };
}
