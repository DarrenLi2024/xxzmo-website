import { NextResponse } from "next/server";
import { z } from "zod";
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

    // Stage 1: 规则预分割
    const candidates = presplitByTitles(text);

    // Stage 2: AI 分类精修（每批最多10篇）
    const BATCH_SIZE = 10;
    const allArticles: ParsedArticle[] = [];

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      const batchText = batch.map((c, idx) =>
        `[${idx + 1}] ${c.title}\n${c.body.slice(0, 600)}`
      ).join('\n---\n');

      const classifyPrompt = `你是古典文学分类专家。为每块判断体裁并提取序跋。只输出JSON。

{
  "items": [
    {
      "candidateIndex": 1,
      "type": "诗/词/文/赋/随笔",
      "subType": "七绝 或 五律 或词牌名 等",
      "preface": "序文(没有则空)",
      "postscript": "跋文(没有则空)",
      "confidence": 0.9,
      "classificationReasons": ["依据"]
    }
  ]
}`;

      const result = await runAiTask(
        "xianyin.classify",
        [
          { role: "system", content: classifyPrompt },
          { role: "user", content: batchText },
        ],
        z.object({
          items: z.array(z.object({
            candidateIndex: z.number().int().min(1),
            type: z.string().default("诗"),
            subType: z.string().default(""),
            preface: z.string().default(""),
            postscript: z.string().default(""),
            confidence: z.number().min(0).max(1).default(0.85),
            classificationReasons: z.array(z.string()).default([]),
          }))
        }),
        {
          promptVersion: XIANYIN_PARSE_PROMPT_VERSION,
          temperature: 0.1,
          maxTokens: 4096,
        }
      );

      for (const item of result.data.items) {
        const candidate = batch[item.candidateIndex - 1];
        if (!candidate) continue;
        allArticles.push({
          id: `ai-s2-${Date.now()}-${item.candidateIndex}`,
          title: candidate.title,
          type: item.type,
          subType: item.subType || undefined,
          body: candidate.body,
          preface: item.preface || undefined,
          postscript: item.postscript || undefined,
          confidence: item.confidence,
          classificationReasons: item.classificationReasons,
          splitReason: "规则预切 + AI分类",
        });
      }
    }

    // 去重
    const seen = new Set<string>();
    const deduped = allArticles.filter(a => {
      const key = a.title + a.body.slice(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      articles: deduped,
      count: deduped.length,
      strategy: `规则预切(${candidates.length}) + AI分类(${allArticles.length})`,
      confidence: 0.9,
      duplicates: [],
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 分篇失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Stage 1: 纯规则预分割。识别所有标题行作为边界 */
function presplitByTitles(text: string): Array<{ title: string; body: string }> {
  const lines = text.split("\n");
  const result: Array<{ title: string; body: string }> = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  const isTitle = (line: string): boolean => {
    const t = line.trim();
    if (!t || t.length > 25) return false;
    return !!(
      /^(五言绝句|七言绝句|五言律诗|七言律诗|五律|七律|五绝|七绝|古风|乐府|新诗|现代诗|词|曲|赋|文|记|序|书)[·.]/.test(t) ||
      /^(如梦令|浣溪沙|蝶恋花|菩萨蛮|清平乐|西江月|忆秦娥|浪淘沙|虞美人|卜算子|临江仙|鹧鸪天|鹊桥仙|踏莎行|声声慢|念奴娇|水调歌头|满江红|沁园春|永遇乐|贺新郎|摸鱼儿|木兰花|采桑子|苏幕遮|破阵子|渔家傲|望海潮|雨霖铃|钗头凤|南乡子|玉楼春|定风波|江城子|一剪梅|霜天晓角|满庭芳|洞仙歌|八声甘州|点绛唇|谒金门|好事近|醉花阴|南歌子|眼儿媚|朝中措|柳梢青|风入松|行香子|千秋岁|天仙子|青玉案|桂枝香|水龙吟|齐天乐|何满子|六幺)[·.].*$/.test(t) ||
      /^(如梦令|浣溪沙|蝶恋花|菩萨蛮|清平乐|西江月|忆秦娥|浪淘沙|虞美人|卜算子|临江仙|鹧鸪天|鹊桥仙|踏莎行|声声慢|念奴娇|水调歌头|满江红|沁园春|永遇乐|贺新郎|摸鱼儿|木兰花|采桑子|苏幕遮|破阵子|渔家傲|望海潮|雨霖铃|钗头凤|南乡子|玉楼春|定风波|江城子|一剪梅|霜天晓角|满庭芳|洞仙歌|八声甘州|点绛唇|谒金门|好事近|醉花阴|南歌子|眼儿媚|朝中措|柳梢青|风入松|行香子|千秋岁|天仙子|青玉案|桂枝香|水龙吟|齐天乐|何满子|六幺)$/.test(t) ||
      /^(其[一二三四五六七八九十]+|[一二三四五六七八九十]+[、.]|\d+[、.])/.test(t) ||
      /^.{2,12}(诗|词|曲|赋|记|序|书|论|说|表|铭|传|状|疏|议|启|笺|随笔|漫笔|琐记|杂记)$/.test(t)
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (isTitle(line) && (i === 0 || !lines[i - 1]?.trim() || currentBody.length >= 3)) {
      if (currentTitle || currentBody.length > 0) {
        result.push({ title: currentTitle || "无题", body: currentBody.join("\n").trim() });
      }
      currentTitle = line;
      currentBody = [];
    } else {
      currentBody.push(lines[i]);
    }
  }

  if (currentTitle || currentBody.length > 0) {
    result.push({ title: currentTitle || "无题", body: currentBody.join("\n").trim() });
  }

  // 合并小尾巴
  const merged: Array<{ title: string; body: string }> = [];
  for (const b of result) {
    const last = merged[merged.length - 1];
    if (last && b.body.length < 20 && b.title === "无题" && !last.title.includes("无题")) {
      last.body += "\n" + (b.body || "");
    } else {
      merged.push(b);
    }
  }

  return merged;
}