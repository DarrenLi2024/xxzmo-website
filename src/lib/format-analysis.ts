import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { formatAnalysisSchema } from "@/lib/ai-schemas";
import { FORMAT_ANALYSIS_PROMPT_VERSION } from "@/lib/prompts";

export async function getOrCreateFormatAnalysis(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { body: true, preface: true, postscript: true, formatAnalysis: true },
  });

  if (!article) {
    return { error: "文章不存在" as const, status: 404 as const };
  }

  if (article.formatAnalysis) {
    return { data: JSON.parse(article.formatAnalysis), cached: true as const };
  }

  const systemPrompt = `你是一位精通中国古典文学的编辑，擅长分析古诗文的格式结构。

请分析古诗文文体，并给出智能换行建议。只输出 JSON：
{
  "type": "五言绝句|七言绝句|五言律诗|七言律诗|词|散文|古文",
  "lineBreakStrategy": "按字数|按标点|保持原行|按段落",
  "lines": [{"text": "第一行文本", "isNewLine": true}],
  "explanation": "简要说明判断依据"
}`;

  const fullText = [
    article.preface ? `【序】${article.preface}` : "",
    `【正文】${article.body}`,
    article.postscript ? `【跋】${article.postscript}` : "",
  ].filter(Boolean).join("\n\n");

  try {
    const aiResult = await runAiTask(
      "article.format",
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请分析以下诗文的格式：\n\n${fullText}` },
      ],
      formatAnalysisSchema,
      {
        promptVersion: FORMAT_ANALYSIS_PROMPT_VERSION,
        temperature: 0.1,
        maxTokens: 2048,
      }
    );

    await prisma.article.update({
      where: { id: articleId },
      data: { formatAnalysis: JSON.stringify(aiResult.data) },
    });

    return { data: aiResult.data, cached: false as const };
  } catch {
    const fallback = {
      type: "未知",
      lineBreakStrategy: "保持原行",
      lines: article.body.split("\n").filter(Boolean).map((line) => ({ text: line, isNewLine: true })),
      explanation: "无法解析 AI 返回的结果，保持原行",
    };

    await prisma.article.update({
      where: { id: articleId },
      data: { formatAnalysis: JSON.stringify(fallback) },
    });

    return { data: fallback, cached: false as const };
  }
}

export async function getStoredFormatAnalysis(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { formatAnalysis: true },
  });

  if (!article) return { error: "文章不存在" as const, status: 404 as const };
  if (!article.formatAnalysis) return { message: "尚未生成格式分析" as const };
  return { data: JSON.parse(article.formatAnalysis) };
}
