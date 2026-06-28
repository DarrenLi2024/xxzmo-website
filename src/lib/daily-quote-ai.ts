import { runAiTextTask } from "@/lib/ai-task";

const DAILY_QUOTE_PROMPT_VERSION = "daily-quote-v1";

interface GeneratedQuote {
  content: string;
  aiPrompt: string;
}

/** 根据 SiteConfig.quoteAiStyle 生成每日名句 */
export async function generateDailyQuote(style: string): Promise<GeneratedQuote> {
  const styleHint = style.trim() || "山林隐逸，洒脱不羁，偶见悲怆";
  const userPrompt = `请创作一句适合作为「每日名句」展示的短句。
要求：
1. 15-30 字，可原创可化用意境，但不要抄袭现成名句
2. 语言典雅，有意境
3. 只输出名句本身，不要解释、不要标点收尾`;

  const aiResult = await runAiTextTask(
    "daily-quote.generate",
    [
      {
        role: "system",
        content: `你是一位精通古典诗文的名句创作者。风格要求：${styleHint}`,
      },
      { role: "user", content: userPrompt },
    ],
    {
      promptVersion: DAILY_QUOTE_PROMPT_VERSION,
      temperature: 0.85,
      maxTokens: 128,
    }
  );

  const content = aiResult.text
    .trim()
    .replace(/^["「『]|["」』]$/g, "")
    .replace(/^好的[，,：:]\s*/i, "")
    .split("\n")[0]
    .trim()
    .slice(0, 40);

  if (content.length < 4) {
    throw new Error("AI 生成的名句过短");
  }

  return {
    content,
    aiPrompt: userPrompt,
  };
}
