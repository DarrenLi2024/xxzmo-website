import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { XIANYIN_PARSE_PROMPT_VERSION } from "@/lib/prompts";

// 每批 5000 字，保证单次 LLM 调用在 8 秒内完成（远低于 Vercel 10s 限制）
const CHUNK_SIZE = 5000;

const systemPrompt = `你是古典诗文分篇专家。从文本中识别并提取独立篇目。每篇包含：标题、正文、序文(如有)、跋文(如有)。

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

标题识别: 体裁\u00b7标题 / 词牌\u00b7标题 / 纯标题行 / 数字序号(其一) / 日期标题
体裁: 诗(句式整齐) / 词(词牌+长短句) / 曲 / 赋(骈俪辞藻) / 文(自由句式) / 联 / 新诗(现代诗) / 打油诗 / 四言 / 六言 / 杂言 / 骚体 / 长短句 / 剧本 / 朗诵稿 / 随笔 / 日记
序文: 标题后正文前,含背景/时间/缘由
跋文: 正文后,含评论/落款
如果文本含不完整篇目,跳过它。

只输出 JSON。`;

export async function POST(request: Request) {
  try {
    const { text, chunkIndex, totalChunks } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "请提供待解析的文本" }, { status: 400 });
    }

    const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 单批模式：文本较短，一次解析
    if (chunkIndex === undefined) {
      const articles = await parseText(cleanText, "单批");
      return NextResponse.json({
        articles,
        done: true,
        count: articles.length,
      }, { status: 200 });
    }

    // 分批模式：前端指定这是第几批
    const articles = await parseText(cleanText, `第${chunkIndex + 1}/${totalChunks}批`);
    return NextResponse.json({
      articles,
      done: chunkIndex >= totalChunks - 1,
      count: articles.length,
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 分篇失败";
    console.error("AI parse error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 调 LLM 解析文本 */
async function parseText(text: string, label: string) {
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
      maxTokens: 8192,
      timeoutMs: 120000,
    }
  );

  return result.data.articles
    .filter((a: any) => a.body?.trim())
    .map((a: any, i: number) => ({
      id: `ai-${Date.now()}-${i}`,
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

// 导出常量供前端使用
export async function GET() {
  return NextResponse.json({ CHUNK_SIZE });
}
