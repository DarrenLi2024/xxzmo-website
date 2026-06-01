import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { xianyinParseSchema } from "@/lib/ai-schemas";
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

interface DuplicateItem {
  original: string;
  duplicate: string;
  type: "exact" | "similar";
  similarity: number;
  diffSummary: string;
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length;
  const shorter = str2.length;
  if (longer === 0) return 1.0;
  const editDistance = levenshteinDistance(str1, str2);
  return (longer - editDistance) / longer;
}

function levenshteinDistance(str1: string, str2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[str2.length] = lastValue;
    }
  }
  return costs[str2.length];
}

function findDuplicates(articles: ParsedArticle[]): DuplicateItem[] {
  const duplicates: DuplicateItem[] = [];
  const n = articles.length;
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a1 = articles[i];
      const a2 = articles[j];
      
      const fullText1 = `${a1.title}${a1.preface || ''}${a1.body}${a1.postscript || ''}`;
      const fullText2 = `${a2.title}${a2.preface || ''}${a2.body}${a2.postscript || ''}`;
      
      const similarity = calculateSimilarity(fullText1, fullText2);
      
      if (similarity >= 0.85) {
        duplicates.push({
          original: a1.title,
          duplicate: a2.title,
          type: similarity >= 0.98 ? "exact" : "similar",
          similarity,
          diffSummary: similarity >= 0.98 
            ? "内容完全相同" 
            : `标题差异: ${a1.title !== a2.title ? '是' : '否'}`,
        });
      }
    }
  }
  
  return duplicates;
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "请提供待解析的文本" }, { status: 400 });
    }

    const providers = await prisma.llmProvider.findMany({
      where: { enabled: true },
      select: { id: true, name: true },
    });

    if (providers.length === 0) {
      return NextResponse.json({ 
        error: "未配置可用的 LLM Provider，无法使用 AI 分篇功能" 
      }, { status: 400 });
    }

    const systemPrompt = `你是一位古典文学专家，擅长分析古诗文结构。你的任务是将输入的文本智能拆分为多篇文章，并识别序文和跋文。

请严格按照以下 JSON 格式输出，不要添加任何额外说明：

{
  "articles": [
    {
      "title": "文章标题",
      "type": "诗/词/文/赋/随笔等",
      "subType": "细分类型如：五言绝句、七言律诗、词牌名等",
      "body": "正文内容（不含序和跋）",
      "preface": "序文内容（如果没有则为空字符串）",
      "postscript": "跋文内容（如果没有则为空字符串）",
      "confidence": 0.95,
      "classificationReasons": ["识别依据1", "识别依据2"],
      "splitReason": "分篇理由"
    }
  ]
}

分篇规则：
1. 标题识别：纯标题行（如"盛世瑞辞"、"春望"等）后跟诗文内容的，整行作为标题
2. 词牌名标题：如"清平乐·村居"、"念奴娇·赤壁怀古"等
3. 体裁+标题：如"七绝·思家"、"五律·春正"等
4. 序文：通常在正文之前，包含写作背景、时间、地点、缘由等说明性文字
5. 跋文：通常在正文之后，包含评论、感慨、时间落款等
6. 如果序或跋与正文界限不明显，可以通过语义分析判断
7. 只保留纯正文内容在body中

体裁识别规则：
- 诗：整齐的句式，多数5言或7言，有韵律
- 词：有词牌名，或句子长短不一但有词的特征
- 文：句子长短不一，无严格韵律
- 赋：韵文性质，辞藻华丽

只输出 JSON，不要有任何其他文字。`;

    const userMessage = `请分析以下文本并进行智能分篇：

${text}`;

    const aiResult = await runAiTask(
      "xianyin.parse",
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      xianyinParseSchema,
      {
        promptVersion: XIANYIN_PARSE_PROMPT_VERSION,
        temperature: 0.3,
        maxTokens: 8192,
      }
    );

    const articles: ParsedArticle[] = aiResult.data.articles.map((a: {
      title: string;
      type: string;
      subType?: string;
      body: string;
      preface?: string;
      postscript?: string;
      confidence?: number;
      classificationReasons?: string[];
      splitReason?: string;
    }, index: number) => ({
      id: `ai-parse-${index}-${Date.now()}`,
      title: a.title || "无题",
      type: a.type || "诗",
      subType: a.subType,
      body: a.body,
      preface: a.preface || undefined,
      postscript: a.postscript || undefined,
      confidence: a.confidence || 0.85,
      classificationReasons: a.classificationReasons || [],
      splitReason: a.splitReason || "AI 智能分析",
    }));

    const duplicates = findDuplicates(articles);

    return NextResponse.json({
      articles,
      count: articles.length,
      strategy: "AI 语义分析",
      confidence: 0.92,
      duplicates,
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 分篇失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
