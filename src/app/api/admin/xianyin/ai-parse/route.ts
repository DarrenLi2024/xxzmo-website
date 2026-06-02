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

// 每轮 LLM 调用的最大输入字符数（~8000 chars ≈ 4000-8000 tokens）
const MAX_CHARS_PER_ROUND = 8000;
// 重叠区：上一轮最后 300 字作为上下文传给下一轮，防止文章在边界被截断
const OVERLAP_CHARS = 300;

const systemPrompt = `你是古典诗文分篇专家。你的任务是从输入文本中，自上而下识别并提取所有独立的诗文篇目。

输出 JSON：
{
  "articles": [
    {
      "title": "原标题",
      "type": "诗/词/文/赋/随笔/日记",
      "subType": "七绝/五律/浣溪沙/记/序 等",
      "body": "完整正文(不含序跋)",
      "preface": "序文(没有则空)",
      "postscript": "跋文(没有则空)",
      "confidence": 0.92,
      "classificationReasons": ["判断依据"]
    }
  ],
  "nextStartHint": "下一轮继续解析的起始短语（当本轮未处理完时提供；若已全部处理完毕则为空字符串）"
}

核心规则：
1. 自上而下逐篇解析，不要跳篇
2. 标题识别：诗文体·标题（如"七绝·思家"）、词牌名·标题（如"浣溪沙·春思"）、纯标题（如"秋日感怀"）、数字序号（如"其一""1."）
3. 序文通常在标题后正文前，包含时间/背景/缘由等说明文字
4. 跋文通常在正文后，包含评论/落款等
5. 正文即诗歌/词/文的主体内容
6. 如果本轮结束时还有大量未处理内容，设置 nextStartHint 为非空字符串（简短标记剩余文本的起始位置）
7. 不要为了填满输出而合并不同篇目

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
    const allArticles: ParsedArticle[] = [];
    let offset = 0;
    let round = 0;
    const maxRounds = 30; // 安全上限

    while (offset < cleanText.length && round < maxRounds) {
      round++;

      // 截取本轮处理的文本
      const chunkEnd = Math.min(offset + MAX_CHARS_PER_ROUND, cleanText.length);
      const chunk = cleanText.slice(offset, chunkEnd);

      // 构造用户消息：提示继续位置
      const progressNote = round === 1
        ? "请从文本开头开始，自上而下逐篇解析。"
        : `请继续解析。这是第 ${round} 轮，从上一轮停止处接续。`;

      const userMsg = `${progressNote}\n\n${chunk}`;

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
          nextStartHint: z.string().default(""),
        }),
        {
          promptVersion: XIANYIN_PARSE_PROMPT_VERSION,
          temperature: 0.1,
          maxTokens: 4096,
        }
      );

      const roundArticles = result.data.articles;
      const hint = result.data.nextStartHint || "";

      // 收集本轮解析的文章
      for (const a of roundArticles) {
        allArticles.push({
          id: `ai-r${round}-${Date.now()}-${allArticles.length}`,
          title: a.title || "无题",
          type: a.type || "诗",
          subType: a.subType || undefined,
          body: a.body,
          preface: a.preface || undefined,
          postscript: a.postscript || undefined,
          confidence: a.confidence || 0.85,
          classificationReasons: a.classificationReasons || [],
          splitReason: `自上而下分批解析 · 第${round}轮`,
        });
      }

      // 计算下一轮的起始偏移
      if (hint && hint.length > 0) {
        // 在 chunk 中搜索 hint 的位置
        const hintIdx = chunk.indexOf(hint);
        if (hintIdx >= 0) {
          offset = offset + hintIdx;
        } else {
          // 如果找不到 hint，则在 chunk 中向后搜索最后一个识别出的文章结尾
          const lastArticle = roundArticles[roundArticles.length - 1];
          if (lastArticle?.body) {
            const bodyStart = chunk.lastIndexOf(lastArticle.body.slice(0, 60));
            if (bodyStart >= 0) {
              offset = offset + bodyStart + lastArticle.body.length;
              // 向上对齐到最近的换行
              while (offset < cleanText.length && cleanText[offset] !== "\n") offset++;
            } else {
              offset = chunkEnd - OVERLAP_CHARS;
            }
          } else {
            offset = chunkEnd - OVERLAP_CHARS;
          }
        }
      } else {
        // 本轮已处理完所有文本
        offset = cleanText.length;
      }

      // 防止死循环：如果 offset 没前进
      if (offset < chunkEnd - OVERLAP_CHARS) {
        // offset 异常，强制推进
        offset = chunkEnd - OVERLAP_CHARS;
      }

      // 如果本轮没解析出任何文章且 hint 为空，结束
      if (roundArticles.length === 0 && !hint) {
        break;
      }
    }

    // 去重
    const seen = new Set<string>();
    const deduped = allArticles.filter(a => {
      const key = a.title + a.body.slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      articles: deduped,
      count: deduped.length,
      rounds: round,
      strategy: `自上而下分批解析 (${round}轮)`,
      confidence: 0.9,
      duplicates: [],
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 分篇失败";
    console.error("AI parse error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
