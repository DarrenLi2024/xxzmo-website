import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { articleAssistSchema } from "@/lib/ai-schemas";
import { ARTICLE_ASSIST_PROMPT_VERSION, buildArticleAssistMessages } from "@/lib/prompts";
import { estimateMaxTokensFromParts } from "@/lib/ai-token-budget";

export async function POST(request: NextRequest) {
  try {
    const { articleIds } = await request.json();

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "缺少文章ID列表" }, { status: 400 });
    }

    const providerCount = await prisma.llmProvider.count({ where: { enabled: true } });
    if (providerCount === 0) {
      return NextResponse.json({ error: "未配置可用的 LLM Provider" }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      items: [] as Array<{ articleId: string; title?: string; status: "success" | "failed" | "skipped"; reason?: string; logId?: string | null }>,
      errors: [] as string[],
    };

    for (const articleId of articleIds) {
      try {
        const article = await prisma.article.findUnique({ where: { id: articleId } });
        if (!article) {
          results.failed++;
          results.items.push({ articleId, status: "failed", reason: "文章不存在" });
          results.errors.push(`文章不存在: ${articleId}`);
          continue;
        }

        const aiResult = await runAiTask(
          "article.assist.batch",
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
          }
        );

        const updateData: Record<string, unknown> = {
          translation: aiResult.data.translation || null,
          appreciation: aiResult.data.appreciation || null,
          annotations: JSON.stringify(aiResult.data.annotations),
          aiRawOutput: aiResult.rawOutput,
          confidence: estimateConfidence(aiResult.data.annotations.length, true),
        };

        const cleanTags = aiResult.data.tagSuggestions
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0);
        if (cleanTags.length > 0) {
          updateData.tagList = JSON.stringify(cleanTags);
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
        }

        await prisma.article.update({ where: { id: articleId }, data: updateData });
        results.success++;
        results.items.push({ articleId, title: article.title, status: "success", logId: aiResult.logId });
      } catch (error) {
        results.failed++;
        const message = error instanceof Error ? error.message : "处理失败";
        results.items.push({ articleId, status: "failed", reason: message });
        results.errors.push(`${message}: ${articleId}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量AI辅助生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function estimateConfidence(annotationCount: number, parsed: boolean) {
  if (!parsed) return 0.35;
  if (annotationCount >= 5) return 0.78;
  if (annotationCount > 0) return 0.68;
  return 0.55;
}
