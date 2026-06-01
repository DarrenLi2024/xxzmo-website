import { z } from "zod";

export const annotationSchema = z.object({
  term: z.string(),
  explanation: z.string(),
  sourceTitle: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
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
  titleSuggestion: z.string().default(""),
  typeSuggestion: z.string().default(""),
  typeExplanation: z.string().default(""),
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

export const paintingAnalysisSchema = z.object({
  keywords: z.array(z.string()).default([]),
  theme: z.string().default("山水"),
  mood: z.string().default("恬淡"),
  style: z.string().default("水墨"),
  matchReason: z.string().default("符合诗文意境"),
  imagery: z.array(z.string()).default([]),
  searchTerms: z.array(z.string()).default([]),
});

export const paintingSearchKeywordsSchema = z.object({
  keywords: z.array(z.string()).default([]),
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

export type ArticleAssistResult = z.infer<typeof articleAssistSchema>;
export type PaintingAnalysisResult = z.infer<typeof paintingAnalysisSchema>;
export type JiguImportResult = z.infer<typeof jiguImportSchema>;
export type PinyinCalibrationResult = z.infer<typeof pinyinCalibrationSchema>;
