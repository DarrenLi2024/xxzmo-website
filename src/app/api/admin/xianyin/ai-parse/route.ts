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

// 每段最多字符数（~6000 chars，约等于 3000-5000 tokens 输入 + 留余量给输出）
const CHUNK_SIZE = 6000;

const systemPrompt = `你是古典诗文分篇专家。从文本中识别并提取所有独立篇目。每篇包含：标题、正文、序文(如有)、跋文(如有)。

输出 JSON:
{
  "articles": [
    {
      "title": "标题",
      "type": "诗/词/文/赋/随笔/日记",
      "subType": "七绝/五律/浣溪沙/记 等",
      "body": "正文",
      "preface": "序(无则空)",
      "postscript": "跋(无则空)",
      "confidence": 0.92,
      "classificationReasons": ["依据"]
    }
  ]
}

标题识别: 体裁·标题(如"七绝·思家") / 词牌·标题(如"浣溪沙·春思") / 纯标题(如"秋日感怀") / 数字序号(如"其一") / 日期(如"2024.03.15")
体裁: 诗(句式整齐,有韵律,通常4-8行) / 词(有词牌,长短句) / 文(自由句式,较长) / 赋(骈俪辞藻) / 随笔/日记(生活化内容)
序文: 标题后正文前的说明文字(背景/时间/缘由)
跋文: 正文后的评论/落款/日期

只输出 JSON。`;

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "请提供待解析的文本" }, { status: 400 });
    }

    const providers = await prisma.llmProvider.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    if (providers.length === 0) {
      return NextResponse.json({ error: "未配置 LLM Provider" }, { status: 400 });
    }

    const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 切分：在最近的空行处断开，保证不切断单行
    const chunks = splitAtBlankLines(cleanText, CHUNK_SIZE);

    // 每段独立调 LLM 分篇
    const allArticles: ParsedArticle[] = [];
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      const userMsg = chunks.length > 1
        ? `第 ${ci + 1}/${chunks.length} 段:\n\n${chunk}`
        : chunk;

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

      for (const a of result.data.articles) {
        if (!a.body?.trim()) continue; // 跳过空篇
        allArticles.push({
          id: `ai-c${ci}-${Date.now()}-${allArticles.length}`,
          title: a.title || "无题",
          type: a.type || "诗",
          subType: a.subType || undefined,
          body: a.body,
          preface: a.preface || undefined,
          postscript: a.postscript || undefined,
          confidence: a.confidence || 0.85,
          classificationReasons: a.classificationReasons || [],
          splitReason: `分段解析 · 第${ci + 1}/${chunks.length}段`,
        });
      }
    }

    // 按标题去重
    const seen = new Set<string>();
    const deduped = allArticles.filter(a => {
      const key = a.title + a.body.slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      articles: deduped,
      count: deduped.length,
      chunks: chunks.length,
      strategy: `分段解析 (${chunks.length}段 → ${deduped.length}篇)`,
      confidence: 0.9,
      duplicates: [],
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 分篇失败";
    console.error("AI parse error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 在最近的空行处切分，保证不切断单行。
 * 每段不超过 maxChars，如果某一段（两个空行之间）本身就超过 maxChars，
 * 则在该段内按行数对半切分。
 */
function splitAtBlankLines(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current && current.length + para.length > maxChars) {
      chunks.push(current.trim());
      current = para;
    } else if (para.length > maxChars) {
      // 单个段落太长，按行对半切
      if (current) chunks.push(current.trim());
      const lines = para.split("\n");
      const mid = Math.ceil(lines.length / 2);
      chunks.push(lines.slice(0, mid).join("\n").trim());
      current = lines.slice(mid).join("\n");
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}
