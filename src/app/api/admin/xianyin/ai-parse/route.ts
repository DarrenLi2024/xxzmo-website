import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { XIANYIN_PARSE_PROMPT_VERSION } from "@/lib/prompts";

interface ParsedArticle {
  id: string;
  title: string;
  body: string;
  type: string;
  subType?: string;
  preface?: string;
  postscript?: string;
  confidence: number;
  classificationReasons: string[];
  splitReason: string;
}

// 每批发送给 LLM 的最大字符数: DeepSeek V4 128K tokens ≈ 250K 中文字符，取保守值
// 长文本超过此值才分批
const MAX_CHARS_PER_CALL = 120000;

const systemPrompt = `你是古典诗文分篇专家。从文本中识别并提取所有独立篇目。每篇包含：标题、正文、序文(如有)、跋文(如有)。

输出 JSON:
{
  "articles": [
    {
      "title": "标题",
      "type": "诗/词/文/赋/随笔/日记",
      "subType": "七绝/五律/词牌名/记/序 等",
      "body": "正文内容",
      "preface": "序文(无则空)",
      "postscript": "跋文(无则空)",
      "confidence": 0.92,
      "classificationReasons": ["判断依据"]
    }
  ]
}

分篇规则:
- 识别标题: 体裁·标题(如"七绝·思家")、词牌·标题(如"浣溪沙·春思")、纯标题行、数字序号(如"其一")、日期标题
- 体裁判断: 诗(句式整齐有韵律)、词(词牌+长短句)、文(自由句式)、赋(骈俪辞藻)、随笔/日记(生活化)
- 序文: 标题后正文前，包含时间/背景/缘由等说明文字
- 跋文: 正文后，包含评论/落款/日期
- 如果文本中包含无法确定边界的片段，跳过它

只输出 JSON。`;

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "请提供待解析的文本" }, { status: 400 });
    }

    const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const textLen = cleanText.length;

    // 全文不超过 12 万字：一次调用 LLM
    if (textLen <= MAX_CHARS_PER_CALL) {
      const articles = await callAiParse(cleanText, 0);
      return NextResponse.json({
        articles,
        count: articles.length,
        strategy: `全文一次解析 (${textLen}字)`,
        confidence: 0.92,
        duplicates: [],
      }, { status: 200 });
    }

    // 超过 12 万字：分批调用，每批 12 万字 + 重叠
    const chunks = splitLarge(cleanText, MAX_CHARS_PER_CALL);
    const allArticles: ParsedArticle[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkArticles = await callAiParse(chunks[i], i);
      allArticles.push(...chunkArticles);
    }

    // 去重
    const seen = new Set<string>();
    const deduped = allArticles.filter(a => {
      const key = a.title + a.body.slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      articles: deduped,
      count: deduped.length,
      strategy: `分批解析 (${chunks.length}批, ${textLen}字)`,
      confidence: 0.88,
      duplicates: [],
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 分篇失败";
    console.error("AI parse error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 调用 LLM 解析文本，返回文章列表 */
async function callAiParse(text: string, batchIndex: number): Promise<ParsedArticle[]> {
  const label = batchIndex > 0 ? `第${batchIndex + 1}批: ${text.length}字` : `${text.length}字`;

  const result = await runAiTask(
    "xianyin.parse",
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    z.object({
      articles: z.array(z.object({
        title: z.string().default("无题"),
        type: z.string().default("诗"),
        subType: z.string().default(""),
        body: z.string(),
        preface: z.string().default(""),
        postscript: z.string().default(""),
        confidence: z.number().min(0).max(1).default(0.85),
        classificationReasons: z.array(z.string()).default([]),
      })),
    }),
    {
      promptVersion: XIANYIN_PARSE_PROMPT_VERSION,
      temperature: 0.05,
      maxTokens: 16384,
      timeoutMs: 300000,
    }
  );

  return result.data.articles
    .filter((a: any) => a.body?.trim())
    .map((a: any, i: number) => ({
      id: `ai-${batchIndex}-${Date.now()}-${i}`,
      title: a.title || "无题",
      type: a.type || "诗",
      subType: a.subType || undefined,
      body: a.body,
      preface: a.preface || undefined,
      postscript: a.postscript || undefined,
      confidence: a.confidence || 0.85,
      classificationReasons: a.classificationReasons || [],
      splitReason: label,
    }));
}

/** 超大文本分批: 每批 maxChars，末尾重叠 500 字 */
function splitLarge(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let pos = 0;
  const overlap = 500;
  while (pos < text.length) {
    const end = Math.min(pos + maxChars, text.length);
    chunks.push(text.slice(pos, end));
    pos = end - overlap;
    if (pos >= text.length - overlap) break;
  }
  return chunks;
}
