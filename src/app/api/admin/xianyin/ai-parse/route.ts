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

// 每段字符数：3000 chars ≈ 1500-2500 中文 tokens
// 加上 system prompt + JSON 输出 overhead，总量控制在 6000 tokens 以内
const CHUNK_CHARS = 3000;
// 段间重叠字符数，防止在标题行处截断
const OVERLAP = 200;

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

标题识别: 体裁\u00b7标题 / 词牌\u00b7标题 / 纯标题行 / 数字序号 / 日期标题
体裁: 诗(句式整齐,有韵律) / 词(词牌+长短句) / 文(自由句式) / 赋(骈俪辞藻) / 随笔/日记(生活化)
序文: 标题后正文前的说明文字
跋文: 正文后的评论/落款

注意: 你看到的文本可能只是全文的一部分，请只解析你能确定边界的篇目。文本开头或结尾处的不完整篇目请跳过。
只输出 JSON。`;

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "请提供待解析的文本" }, { status: 400 });
    }

    const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 文本不太长就直接一次解析
    if (cleanText.length <= CHUNK_CHARS + OVERLAP) {
      const singleResult = await parseSingle(cleanText);
      return NextResponse.json({
        articles: singleResult,
        count: singleResult.length,
        strategy: "单段解析",
        confidence: 0.92,
        duplicates: [],
      }, { status: 200 });
    }

    // 长文本硬切分：每 CHUNK_CHARS 一段，OVERLAP 重叠
    const chunks = hardSplit(cleanText, CHUNK_CHARS, OVERLAP);
    const allArticles: ParsedArticle[] = [];

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      const userMsg = `第 ${ci + 1}/${chunks.length} 段:\n\n${chunk}`;
      const chunkResult = await parseChunk(userMsg, ci);
      allArticles.push(...chunkResult);
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
      chunks: chunks.length,
      strategy: `硬切分${chunks.length}段解析 → ${deduped.length}篇`,
      confidence: 0.88,
      duplicates: [],
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 分篇失败";
    console.error("AI parse error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function parseSingle(text: string): Promise<ParsedArticle[]> {
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
      temperature: 0.1,
      maxTokens: 4096,
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
      splitReason: "单段解析",
    }));
}

async function parseChunk(userMsg: string, chunkIndex: number): Promise<ParsedArticle[]> {
  const result = await runAiTask(
    "xianyin.parse",
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMsg },
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
      temperature: 0.1,
      maxTokens: 4096,
    }
  );

  return result.data.articles
    .filter((a: any) => a.body?.trim())
    .map((a: any, i: number) => ({
      id: `ai-c${chunkIndex}-${Date.now()}-${i}`,
      title: a.title || "无题",
      type: a.type || "诗",
      subType: a.subType || undefined,
      body: a.body,
      preface: a.preface || undefined,
      postscript: a.postscript || undefined,
      confidence: a.confidence || 0.85,
      classificationReasons: a.classificationReasons || [],
      splitReason: `分段${chunkIndex + 1}`,
    }));
}

/** 硬切分：每段 maxChars 字符， overlap 重叠 */
function hardSplit(text: string, maxChars: number, overlap: number): string[] {
  const chunks: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    const end = Math.min(pos + maxChars, text.length);
    chunks.push(text.slice(pos, end));
    pos = end - overlap;
    if (pos >= text.length - 10) break; // 最后一段可能很短，合并到上一段
  }
  return chunks;
}
