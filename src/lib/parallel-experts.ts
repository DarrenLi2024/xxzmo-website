import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { articleAssistSchema } from "@/lib/ai-schemas";
import { ARTICLE_ASSIST_PROMPT_VERSION, buildArticleAssistMessages } from "@/lib/prompts";
import { calibrateArticlePinyin } from "@/lib/pinyin-calibration";
import { estimateMaxTokensFromParts } from "@/lib/ai-token-budget";
import type { UnifiedResult } from "@/lib/unified-calibration";

const PARALLEL_EXPERTS_PROMPT_VERSION = "parallel-experts-v1";

/**
 * 并行 Expert 模式：文学分析 + 拼音校准并行执行（2 路 LLM）。
 * 适用于 policy=parallel 的 workflow，强模型可专注长文赏析。
 */
export async function runParallelExperts(articleId: string): Promise<UnifiedResult> {
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
  if (!article) throw new Error("文章不存在");

  const startedAt = Date.now();

  const [literaryResult, pinyinResult] = await Promise.all([
    runAiTask(
      "article.expert.literary",
      buildArticleAssistMessages({
        title: article.title,
        author: article.author,
        body: article.body,
        dateRaw: article.dateRaw,
        preface: article.preface,
        postscript: article.postscript,
        notes: article.notes,
      }),
      articleAssistSchema,
      {
        promptVersion: ARTICLE_ASSIST_PROMPT_VERSION,
        temperature: 0.3,
        maxTokens: estimateMaxTokensFromParts(
          "json-assist",
          article.title,
          article.body,
          article.preface,
          article.postscript,
          article.notes
        ),
        timeoutMs: 90000,
      }
    ),
    calibrateArticlePinyin(articleId),
  ]);

  const parsed = literaryResult.data;
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

  await prisma.article.update({
    where: { id: articleId },
    data: {
      translation: parsed.translation || null,
      appreciation: parsed.appreciation || null,
      annotations: JSON.stringify(parsed.annotations),
      aiRawOutput: literaryResult.rawOutput,
      confidence: parsed.annotations.length >= 5 ? 0.78 : parsed.annotations.length > 0 ? 0.68 : 0.55,
      ...(cleanTags.length > 0 ? { tagList: JSON.stringify(cleanTags) } : {}),
    },
  });

  const durationMs = Date.now() - startedAt;

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
      data: pinyinResult.data,
      summary: pinyinResult.summary,
      correctionCount: pinyinResult.correctionCount,
      uncertainCount: pinyinResult.uncertainCount,
      logId: pinyinResult.logId,
      providerModel: pinyinResult.providerModel,
    },
    aiMeta: {
      taskName: "article.parallel-experts",
      promptVersion: PARALLEL_EXPERTS_PROMPT_VERSION,
      logId: literaryResult.logId,
      providerName: literaryResult.providerName,
      providerModel: literaryResult.providerModel,
      durationMs,
    },
  };
}
