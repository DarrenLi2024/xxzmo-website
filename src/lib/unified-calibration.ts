import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { unifiedAssistSchema, UNIFIED_ASSIST_PROMPT_VERSION } from "@/lib/ai-schemas";
import { buildUnifiedAssistMessages } from "@/lib/prompts";
import { resolvePromptVersion, getPromptRuntimeOptions } from "@/lib/prompt-experiments";
import { estimateMaxTokensFromParts } from "@/lib/ai-token-budget";
import {
  applyContextPinyinCorrections,
  buildArticlePinyinData,
  ensurePinyinDict,
  type ArticlePinyinData,
} from "@/lib/article-pinyin";

export interface UnifiedResult {
  // AI 辅助结果
  authorSuggestion: string;
  titleSuggestion: string;
  typeSuggestion: string;
  typeExplanation: string;
  dynastySuggestion: string;
  annotations: Array<{
    term: string;
    explanation: string;
    sourceTitle?: string;
    sourceUrl?: string;
    quote?: string;
    confidence?: number;
  }>;
  translation: string;
  appreciation: string;
  tagSuggestions: string[];
  suggestions: Array<{
    category: string;
    original: string;
    suggestion: string;
    confidence: number;
    explanation: string;
    applied: boolean;
  }>;
  // 拼音校准结果
  pinyin: {
    data: ArticlePinyinData;
    summary: string;
    correctionCount: number;
    uncertainCount: number;
    logId: string | null;
    providerModel: string;
  };
  // AI 元信息
  aiMeta: {
    taskName: string;
    promptVersion: string;
    logId: string | null;
    providerName: string;
    providerModel: string;
    durationMs: number;
  };
}

function formatPinyinMap(items: Array<{ char: string; pinyin: string }>) {
  return items.map((item) => item.pinyin ? `${item.pinyin}${item.char}` : item.char).join("");
}

/**
 * 一键完成 AI 辅助分析 + 拼音语境校准（一次 LLM 调用）
 * 同时更新文章 DB 记录（annotations, translation, appreciation, tags, pinyin）
 */
export async function runUnifiedCalibration(
  articleId: string,
  options?: {
    sourceEvidence?: {
      title?: string;
      url?: string;
      excerpt?: string;
      body?: string;
    } | null;
  }
): Promise<UnifiedResult> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      author: true,
      body: true,
      dateRaw: true,
      preface: true,
      postscript: true,
      notes: true,
    },
  });

  if (!article) {
    throw new Error("文章不存在");
  }

  // 1. 生成 baseline 拼音（只给 LLM 作为参考）
  await ensurePinyinDict();
  const baseline = buildArticlePinyinData(article);

  // 2. 一次 LLM 调用完成两部分任务（Prompt A/B 分桶）
  const promptVersion = resolvePromptVersion("article.unified-calibration", articleId);
  const runtimeOptions = getPromptRuntimeOptions(promptVersion);
  const maxTokens = runtimeOptions.maxTokens
    ?? estimateMaxTokensFromParts(
      "json-unified",
      article.title,
      article.body,
      article.preface,
      article.postscript,
      article.notes
    );

  const aiResult = await runAiTask(
    "article.unified-calibration",
    buildUnifiedAssistMessages({
      title: article.title,
      author: article.author,
      body: article.body,
      dateRaw: article.dateRaw,
      preface: article.preface,
      postscript: article.postscript,
      notes: article.notes,
      sourceEvidence: options?.sourceEvidence ?? undefined,
      baselineBodyPinyin: formatPinyinMap(baseline.bodyMap),
    }),
    unifiedAssistSchema,
    {
      promptVersion,
      temperature: runtimeOptions.temperature ?? 0.25,
      maxTokens,
      timeoutMs: 90000,
    }
  );

  const parsed = aiResult.data;

  // 3. 拼音校准：应用 corrections
  const merged = applyContextPinyinCorrections(baseline, parsed.pinyin?.corrections ?? []);
  const pinyinData: ArticlePinyinData = {
    ...merged.data,
    calibration: {
      promptVersion,
      reviewedAt: new Date().toISOString(),
      logId: aiResult.logId,
      providerModel: aiResult.providerModel,
      corrections: merged.applied,
      uncertain: [...(parsed.pinyin?.uncertain ?? []), ...merged.skipped],
    },
  };

  // 4. 高置信度自动入字典
  for (const c of merged.applied) {
    if (c.confidence >= 0.85 && c.text.length >= 2) {
      await prisma.pinyinDict.upsert({
        where: { phrase: c.text },
        create: {
          phrase: c.text,
          pinyin: c.pinyin.join(" "),
          category: "通假字",
          source: article.title,
          verified: false,
          aiLogId: aiResult.logId,
        },
        update: {
          pinyin: c.pinyin.join(" "),
          source: article.title,
          aiLogId: aiResult.logId,
        },
      });
    }
  }

  // 5. 处理标签
  const cleanTags = parsed.tagSuggestions
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0);

  for (const tagName of cleanTags) {
    const tag = await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
    await prisma.tagOnArticle.upsert({
      where: { articleId_tagId: { articleId, tagId: tag.id } },
      update: {},
      create: { articleId, tagId: tag.id },
    });
  }

  // 6. 更新文章
  const updateData: Record<string, unknown> = {
    translation: parsed.translation || null,
    appreciation: parsed.appreciation || null,
    annotations: JSON.stringify(parsed.annotations),
    pinyin: JSON.stringify(pinyinData),
    aiRawOutput: aiResult.rawOutput,
    confidence: parsed.annotations.length >= 5 ? 0.78 : parsed.annotations.length > 0 ? 0.68 : 0.55,
  };

  if (cleanTags.length > 0) {
    updateData.tagList = JSON.stringify(cleanTags);
  }

  await prisma.article.update({
    where: { id: articleId },
    data: updateData,
  });

  return {
    authorSuggestion: parsed.authorSuggestion,
    titleSuggestion: parsed.titleSuggestion,
    typeSuggestion: parsed.typeSuggestion,
    typeExplanation: parsed.typeExplanation,
    dynastySuggestion: parsed.dynastySuggestion,
    annotations: parsed.annotations,
    translation: parsed.translation,
    appreciation: parsed.appreciation,
    tagSuggestions: parsed.tagSuggestions,
    suggestions: parsed.suggestions,
    pinyin: {
      data: pinyinData,
      summary: parsed.pinyin?.summary ?? "",
      correctionCount: merged.applied.length,
      uncertainCount: pinyinData.calibration?.uncertain.length ?? 0,
      logId: aiResult.logId,
      providerModel: aiResult.providerModel,
    },
    aiMeta: {
      taskName: "article.unified-calibration",
      promptVersion,
      logId: aiResult.logId,
      providerName: aiResult.providerName,
      providerModel: aiResult.providerModel,
      durationMs: aiResult.durationMs,
    },
  };
}
