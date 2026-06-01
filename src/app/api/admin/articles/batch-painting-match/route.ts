import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { paintingAnalysisSchema } from "@/lib/ai-schemas";
import { PAINTING_MATCH_PROMPT_VERSION } from "@/lib/prompts";

interface PaintingMatch {
  id: string;
  title: string;
  artist: string | null;
  dynasty: string | null;
  url: string;
  thumbnail: string | null;
  description: string | null;
  relevance: number;
  matchReason: string;
  isNew: boolean;
}

interface AiAnalysisResult {
  keywords: string[];
  theme: string;
  mood: string;
  style: string;
  matchReason: string;
}

const PAINTING_THEMES: Record<string, string[]> = {
  "山水": ["landscape", "mountain", "water", "river", "sea", "rocks", "trees"],
  "云雾": ["mist", "clouds", "fog", "haze", "vapor"],
  "人物": ["figure", "portrait", "person", "people"],
  "花鸟": ["flower", "bird", "plum", "orchid", "bamboo", "peony", "lotus"],
  "楼阁": ["pavilion", "building", "architecture", "house", "palace", "tower"],
  "行旅": ["travel", "journey", "boat", "horse", "carriage", "walking"],
  "隐逸": ["recluse", "hermit", "scholar", "retreat", "solitude"],
  "田园": ["farm", "field", "village", "countryside", "pastoral"],
  "渔樵": ["fishing", "woodcutter", "boat", "net"],
  "松柏": ["pine", "cypress", "cypress tree"],
  "明月": ["moon", "night", "moonlight"],
  "清风": ["wind", "breeze", "scroll"],
};

const PAINTING_MOODS: Record<string, string[]> = {
  "恬淡": ["serene", "peaceful", "tranquil", "calm", "quiet"],
  "萧瑟": ["melancholy", "solitary", "desolate", "withered"],
  "壮阔": ["grand", "majestic", "vast", "spectacular", "lofty"],
  "婉约": ["elegant", "graceful", "delicate", "refined", "soft"],
  "清雅": ["pure", "elegant", "refined", "cultivated", "scholarly"],
  "苍茫": ["vast", "boundless", "hazy", "indistinct"],
  "幽静": ["secluded", "quiet", "peaceful", "tranquil"],
};

async function analyzeContentForPainting(title: string, body: string, tags: string[]): Promise<AiAnalysisResult> {
  const systemPrompt = `你是一位精通中国古典文学与国画的大师，擅长根据诗文内容匹配最适合的古典国画。

请分析以下诗文的绘画主题和风格，返回用于检索古典国画的关键词。

只输出 JSON：
{
  "keywords": ["keyword1", "keyword2"],
  "theme": "山水",
  "mood": "恬淡",
  "style": "古典",
  "matchReason": "10字内理由",
  "imagery": [],
  "searchTerms": []
}

注意：
1. 关键词要能在国画图库中检索到匹配结果
2. 考虑诗文中出现的具体意象（松、鹤，云、月、水、山等）
3. 根据主题和氛围选择合适的画风`;

  const userMessage = `标题：${title}
正文：${body}
标签：${tags.join(", ")}`;

  try {
    const result = await runAiTask(
      "painting.match.batch",
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      paintingAnalysisSchema,
      {
        promptVersion: PAINTING_MATCH_PROMPT_VERSION,
        temperature: 0.3,
        maxTokens: 500,
      }
    );
    return result.data;
  } catch (error) {
    console.error("AI分析失败:", error);
    return {
      keywords: tags.slice(0, 3),
      theme: "山水",
      mood: "恬淡",
      style: "古典",
      matchReason: "默认推荐",
    };
  }
}

async function searchExistingPaintings(keywords: string[], theme: string, mood: string): Promise<any[]> {
  const allKeywords = [
    ...keywords,
    ...(PAINTING_THEMES[theme] || []),
    ...(PAINTING_MOODS[mood] || []),
  ];

  const uniqueKeywords = [...new Set(allKeywords)].slice(0, 5);

  try {
    const paintings = await prisma.painting.findMany({
      where: {
        OR: uniqueKeywords.map((keyword) => ({
          OR: [
            { title: { contains: keyword } },
            { artist: { contains: keyword } },
            { tags: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        })),
      },
      take: 5,
    });
    return paintings;
  } catch (error) {
    console.error("搜索配图失败:", error);
    return [];
  }
}

async function saveMatchedPainting(paintingData: {
  title: string;
  artist: string | null;
  dynasty: string | null;
  url: string;
  thumbnail: string | null;
  externalId: string;
  externalSource: string;
  description: string | null;
  tags: string[];
  matchKeywords: string[];
}): Promise<string> {
  let painting = await prisma.painting.findUnique({
    where: { externalId: paintingData.externalId },
  });

  if (!painting) {
    painting = await prisma.painting.create({
      data: {
        title: paintingData.title,
        artist: paintingData.artist,
        dynasty: paintingData.dynasty,
        url: paintingData.url,
        thumbnail: paintingData.thumbnail,
        externalId: paintingData.externalId,
        externalSource: paintingData.externalSource,
        description: paintingData.description,
        tags: JSON.stringify(paintingData.tags),
        matchKeywords: JSON.stringify(paintingData.matchKeywords),
      },
    });
  }

  await prisma.painting.update({
    where: { id: painting.id },
    data: { matchCount: { increment: 1 } },
  });

  return painting.id;
}

function calculateRelevance(painting: any, keywords: string[], theme: string, mood: string): number {
  let score = 0;
  const titleLower = painting.title.toLowerCase();
  const tags = JSON.parse(painting.tags || "[]");

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    if (titleLower.includes(keywordLower)) score += 0.3;
    if (tags.some((t: string) => t.toLowerCase().includes(keywordLower))) score += 0.2;
  }

  const themeKeywords = PAINTING_THEMES[theme] || [];
  if (themeKeywords.some((t) => titleLower.includes(t))) score += 0.2;

  const moodKeywords = PAINTING_MOODS[mood] || [];
  if (moodKeywords.some((t) => titleLower.includes(t))) score += 0.1;

  return Math.min(score, 1);
}

export async function POST(request: NextRequest) {
  try {
    const { articleIds } = await request.json();

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "缺少文章ID列表" }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const articleId of articleIds) {
      try {
        const article = await prisma.article.findUnique({
          where: { id: articleId },
          include: {
            tags: { include: { tag: true } },
            painting: true,
          },
        });

        if (!article) {
          results.failed++;
          results.errors.push(`文章不存在: ${articleId}`);
          continue;
        }

        if (article.painting) {
          results.skipped++;
          continue;
        }

        const tags = article.tags.map((t: any) => t.tag.name);
        const analysisResult = await analyzeContentForPainting(article.title, article.body, tags);

        const existingPaintings = await searchExistingPaintings(
          analysisResult.keywords,
          analysisResult.theme,
          analysisResult.mood
        );

        if (existingPaintings.length > 0) {
          const bestMatch = existingPaintings[0];
          await prisma.article.update({
            where: { id: articleId },
            data: { paintingId: bestMatch.id },
          });
          results.success++;
          continue;
        }

        results.skipped++;
        results.errors.push(`未找到可自动确认的配图候选: ${article.title}`);
      } catch (error) {
        results.failed++;
        const message = error instanceof Error ? error.message : "处理失败";
        results.errors.push(`${message}: ${articleId}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量AI配图失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
