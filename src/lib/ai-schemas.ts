import { z } from "zod";

/** LLM 常返回「无」「见正文」等非 URL 文本，校验前归一化为空或合法 http(s) URL */
function normalizeOptionalSourceUrl(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch {
    // 非法 URL 丢弃，避免阻断整次 AI 辅助
  }
  return "";
}

const optionalSourceUrlSchema = z.preprocess(
  normalizeOptionalSourceUrl,
  z.string()
);

export const annotationSchema = z.object({
  term: z.string(),
  explanation: z.string(),
  sourceTitle: z.string().optional(),
  sourceUrl: optionalSourceUrlSchema.optional(),
  quote: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const aiSuggestionSchema = z.object({
  category: z.string(),
  original: z.string(),
  suggestion: z.string(),
  confidence: z.number().min(0).max(1).default(0.75),
  explanation: z.string(),
  applied: z.boolean().default(false),
});

export const articleAssistSchema = z.object({
  authorSuggestion: z.string().default(""),
  titleSuggestion: z.string().default(""),
  typeSuggestion: z.string().default(""),
  typeExplanation: z.string().default(""),
  dynastySuggestion: z.string().default(""),
  annotations: z.array(annotationSchema).default([]),
  translation: z.string().default(""),
  appreciation: z.string().default(""),
  tagSuggestions: z.array(z.string()).default([]),
  suggestions: z.array(aiSuggestionSchema).default([]),
});

export const reviewIssueSchema = z.object({
  category: z.string(),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  target: z.string().default(""),
  detail: z.string().default(""),
  suggestion: z.string().default(""),
  field: z.union([
    z.enum([
      "title", "author", "type", "dateRaw", "preface", "body",
      "postscript", "notes", "annotations", "translation", "appreciation",
    ]),
    z.literal(""),
  ]).optional(),
  original: z.string().default(""),
  replacement: z.string().default(""),
});

export const articleReviewSchema = z.object({
  overall: z.enum(["pass", "review", "risk"]).default("review"),
  score: z.number().min(0).max(100).default(70),
  summary: z.string(),
  issues: z.array(reviewIssueSchema).default([]),
  strengths: z.array(z.string()).default([]),
  publishAdvice: z.string(),
});

export const formatAnalysisSchema = z.object({
  type: z.string(),
  lineBreakStrategy: z.string(),
  lines: z.array(z.object({
    text: z.string(),
    isNewLine: z.boolean().default(true),
  })),
  explanation: z.string(),
});

// ============================================================
// Unified Assist + Pinyin Calibration Schema (v2)
// 将 article.assist + pinyin.calibration 合并为一次 LLM 调用
// ============================================================
export const unifiedAssistSchema = z.object({
  // --- AI 辅助部分 ---
  authorSuggestion: z.string().default(""),
  titleSuggestion: z.string().default(""),
  typeSuggestion: z.string().default(""),
  typeExplanation: z.string().default(""),
  dynastySuggestion: z.string().default(""),
  annotations: z.array(annotationSchema).default([]),
  translation: z.string().default(""),
  appreciation: z.string().default(""),
  tagSuggestions: z.array(z.string()).default([]),
  suggestions: z.array(aiSuggestionSchema).default([]),
  // --- 拼音校准部分 ---
  pinyin: z.object({
    summary: z.string().default(""),
    corrections: z.array(z.object({
      field: z.enum(["title", "author", "body"]),
      text: z.string().min(1),
      occurrence: z.number().int().min(1).default(1),
      pinyin: z.array(z.string()),
      reason: z.string().default("语境校准"),
      confidence: z.number().min(0).max(1).default(0.8),
    })).default([]),
    uncertain: z.array(z.string()).default([]),
  }).optional(),
});

export const UNIFIED_ASSIST_PROMPT_VERSION = "unified-assist-v1";

// Legacy — 保留向后兼容
export const pinyinCalibrationSchema = z.object({
  summary: z.string().default(""),
  corrections: z.array(z.object({
    field: z.enum(["title", "author", "body"]),
    text: z.string().min(1),
    occurrence: z.number().int().min(1).default(1),
    pinyin: z.array(z.string()),
    reason: z.string().default("语境校准"),
    confidence: z.number().min(0).max(1).default(0.8),
  })).default([]),
  uncertain: z.array(z.string()).default([]),
});

export const xianyinArticleSchema = z.object({
  title: z.string().default("无题"),
  type: z.string().default("诗"),
  subType: z.string().optional().default(""),
  body: z.string().default(""),
  preface: z.string().optional().default(""),
  postscript: z.string().optional().default(""),
  confidence: z.number().min(0).max(1).default(0.85),
  classificationReasons: z.array(z.string()).default([]),
  splitReason: z.string().default("AI 智能分析"),
});

export const xianyinParseSchema = z.object({
  articles: z.array(xianyinArticleSchema),
});

export const jiguImportSchema = z.object({
  author: z.string().default("佚名"),
  dynasty: z.string().default(""),
  type: z.string().default("文"),
  annotations: z.array(annotationSchema).default([]),
  translation: z.string().default(""),
  appreciation: z.string().default(""),
  tags: z.array(z.string()).default([]),
});

/** 辑古台 LLM 来源检索：仅提取原文，不含注释/译文 */
export const jiguSourceExtractSchema = z.object({
  title: z.string().default(""),
  author: z.string().default("佚名"),
  body: z.string().min(20),
});

export type ArticleAssistResult = z.infer<typeof articleAssistSchema>;
export type JiguImportResult = z.infer<typeof jiguImportSchema>;
export type PinyinCalibrationResult = z.infer<typeof pinyinCalibrationSchema>;
export type UnifiedAssistResult = z.infer<typeof unifiedAssistSchema>;

// ============================================================
// AI 去重决策 Schema
// ============================================================
export const dedupDecisionSchema = z.object({
  keepId: z.string().describe("应该保留的文章ID"),
  deleteId: z.string().describe("应该删除的文章ID"),
  confidence: z.number().min(0).max(1).describe("决策置信度 0-1"),
  reason: z.string().describe("决策理由"),
});

export type DedupDecisionResult = z.infer<typeof dedupDecisionSchema>;

export const paintingAnalysisSchema = z.object({
  keywords: z.array(z.string()).default([]),
  theme: z.string().default("山水"),
  mood: z.string().default("恬淡"),
  style: z.string().default("水墨"),
  matchReason: z.string().default("符合诗文意境"),
  imagery: z.array(z.string()).default([]),
  searchTerms: z.array(z.string()).default([]),
});

export type PaintingAnalysisResult = z.infer<typeof paintingAnalysisSchema>;
