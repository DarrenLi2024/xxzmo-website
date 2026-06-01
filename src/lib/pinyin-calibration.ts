import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { pinyinCalibrationSchema } from "@/lib/ai-schemas";
import { PINYIN_CALIBRATION_PROMPT_VERSION, buildPinyinCalibrationMessages } from "@/lib/prompts";
import { applyContextPinyinCorrections, buildArticlePinyinData, ensurePinyinDict } from "@/lib/article-pinyin";

export async function calibrateArticlePinyin(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, author: true, body: true },
  });

  if (!article) {
    throw new Error("文章不存在");
  }

  await ensurePinyinDict();
  const baseline = buildArticlePinyinData(article);
  const aiResult = await runAiTask(
    "article.pinyin.calibration",
    buildPinyinCalibrationMessages({
      title: article.title,
      author: article.author,
      body: article.body,
      baselineBody: formatPinyinMap(baseline.bodyMap),
    }),
    pinyinCalibrationSchema,
    {
      promptVersion: PINYIN_CALIBRATION_PROMPT_VERSION,
      temperature: 0.1,
      maxTokens: 4096,
    }
  );

  const merged = applyContextPinyinCorrections(baseline, aiResult.data.corrections);
  const data = {
    ...merged.data,
    calibration: {
      promptVersion: PINYIN_CALIBRATION_PROMPT_VERSION,
      reviewedAt: new Date().toISOString(),
      logId: aiResult.logId,
      providerModel: aiResult.providerModel,
      corrections: merged.applied,
      uncertain: [...aiResult.data.uncertain, ...merged.skipped],
    },
  };

  await prisma.article.update({
    where: { id: article.id },
    data: { pinyin: JSON.stringify(data) },
  });

  return {
    data,
    summary: aiResult.data.summary,
    correctionCount: merged.applied.length,
    uncertainCount: data.calibration.uncertain.length,
    logId: aiResult.logId,
    providerModel: aiResult.providerModel,
  };
}

function formatPinyinMap(items: Array<{ char: string; pinyin: string }>) {
  return items.map((item) => item.pinyin ? `${item.pinyin}${item.char}` : item.char).join("");
}
