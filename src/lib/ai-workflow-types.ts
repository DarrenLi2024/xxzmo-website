export const WORKFLOW_STEPS = [
  "parse.normalize",
  "dedupe.check",
  "article.unified-calibration",
  "format.analyze",
  "article.review",
  "painting.recommend",
  "decision.route",
] as const;

export type AiWorkflowStepName = typeof WORKFLOW_STEPS[number];

/** 含配图推荐的 policy 值 */
export const PAINTING_POLICIES = new Set(["full", "with-painting"]);
