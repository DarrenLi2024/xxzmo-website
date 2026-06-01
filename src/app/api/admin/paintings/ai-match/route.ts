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
  imagery: string[];
  searchTerms: string[];
}

const DEFAULT_PAINTINGS = [
  {
    title: "富春山居图",
    artist: "黄公望",
    dynasty: "元",
    url: "https://res.cbvea.com/painting/2024/03/fuchun.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/fuchun_thumb.jpg",
    description: "元代画家黄公望的代表作，以浙江富春江为背景，描绘了连绵起伏的山峦和江上的渔舟",
    tags: ["山水", "富春", "山居", "渔舟", "隐逸"],
  },
  {
    title: "千里江山图",
    artist: "王希孟",
    dynasty: "宋",
    url: "https://res.cbvea.com/painting/2024/03/qianli.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/qianli_thumb.jpg",
    description: "北宋画家王希孟的传世之作，以青绿山水技法描绘了祖国的壮丽山河",
    tags: ["山水", "青绿", "江山", "壮阔", "磅礴"],
  },
  {
    title: "清明上河图",
    artist: "张择端",
    dynasty: "宋",
    url: "https://res.cbvea.com/painting/2024/03/qingming.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/qingming_thumb.jpg",
    description: "北宋画家张择端的风俗画杰作，描绘了汴京清明时节的繁华景象",
    tags: ["人物", "市井", "风俗", "繁华", "都市"],
  },
  {
    title: "墨梅图",
    artist: "王冕",
    dynasty: "元",
    url: "https://res.cbvea.com/painting/2024/03/plum.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/plum_thumb.jpg",
    description: "元代画家王冕的墨梅作品，以水墨技法表现梅花的清雅高洁",
    tags: ["花鸟", "梅花", "墨笔", "清雅", "高洁"],
  },
  {
    title: "松鹤延年图",
    artist: "沈铨",
    dynasty: "清",
    url: "https://res.cbvea.com/painting/2024/03/crane.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/crane_thumb.jpg",
    description: "清代画家沈铨的作品，描绘松鹤延年的吉祥寓意",
    tags: ["花鸟", "松鹤", "吉祥", "延年", "祥瑞"],
  },
  {
    title: "兰竹图",
    artist: "郑板桥",
    dynasty: "清",
    url: "https://res.cbvea.com/painting/2024/03/bamboo.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/bamboo_thumb.jpg",
    description: "清代画家郑板桥的兰竹作品，以简练的笔墨表现兰竹的神韵",
    tags: ["花鸟", "兰竹", "文人画", "清雅", "君子"],
  },
];

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

async function analyzeContentForPainting(
  title: string,
  body: string,
  tags: string[]
): Promise<AiAnalysisResult> {
  const systemPrompt = `你是中国古典文学与国画的双重专家，精通从先秦到明清的诗词文赋，以及历代国画风格。

请深入分析以下诗文，提取可用于匹配国画的关键信息。

## 分析维度

1. **核心意象**：诗文中出现的自然景物（山水云月花鸟等）、人物活动、情感基调
2. **主题归类**：送别、怀古、田园、边塞、闺怨、山水、咏物、闲适、羁旅等
3. **情感氛围**：恬淡、萧瑟、壮阔、婉约、清雅、苍茫、幽静等
4. **画风倾向**：青绿山水、水墨写意、工笔重彩等

## 输出格式

只输出 JSON：
{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "theme": "山水",
  "mood": "恬淡",
  "style": "水墨",
  "imagery": ["意象1", "意象2"],
  "matchReason": "15字内说明",
  "searchTerms": ["english term 1", "english term 2"]
}

## 匹配原则

1. 优先匹配诗文中明确出现的意象（如写"春江花月夜"应匹配月夜、江水、花等意象的画）
2. 考虑情感基调的契合（悲秋不宜配春和景明）
3. 画风应与诗文风格相称（豪放诗配壮阔山水，婉约词配清雅小景）
4. 优先选择中国古典国画，避免西方绘画`;

  const userMessage = `请深入分析以下诗文的配图需求：

【标题】${title}
【正文】${body}
【现有标签】${tags.join(", ") || "无"}

请从文学意象、主题情感、画风倾向等多个维度进行分析，为这幅诗文匹配最适合的古典国画。`;

  try {
    const result = await runAiTask(
      "painting.match",
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      paintingAnalysisSchema,
      {
        promptVersion: PAINTING_MATCH_PROMPT_VERSION,
        temperature: 0.4,
        maxTokens: 800,
      }
    );
    return result.data;
  } catch (error) {
    console.error("AI分析失败:", error);
    return {
      keywords: tags.slice(0, 5),
      theme: "山水",
      mood: "恬淡",
      style: "水墨",
      imagery: [],
      matchReason: "默认推荐",
      searchTerms: tags.slice(0, 3),
    };
  }
}

async function fetchFromMetMuseum(query: string): Promise<any[]> {
  const results: any[] = [];
  
  try {
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true&medium=Paintings`;
    
    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const searchData = await response.json();
      const objectIDs = searchData.objectIDs || [];
      
      const shuffled = objectIDs.sort(() => Math.random() - 0.5);
      const toFetch = shuffled.slice(0, 15);

      for (const objectID of toFetch) {
        try {
          const objectUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`;
          const objectResponse = await fetch(objectUrl);
          
          if (objectResponse.ok) {
            const objectData = await objectResponse.json();
            
            if (objectData.primaryImage && objectData.objectName) {
              const isChineseOrAsian = objectData.culture && 
                (objectData.culture.includes("Chinese") || 
                 objectData.culture.includes("China") ||
                 objectData.culture.includes("Japanese") ||
                 objectData.culture.includes("Korean") ||
                 objectData.culture.includes("Asian"));

              const isScrollOrPainting = objectData.objectName &&
                (objectData.objectName.toLowerCase().includes("painting") || 
                 objectData.objectName.toLowerCase().includes("scroll") ||
                 objectData.objectName.toLowerCase().includes("hanging scroll") ||
                 objectData.objectName.toLowerCase().includes("album leaf") ||
                 objectData.objectName.toLowerCase().includes("handscroll"));

              const hasArtisticValue = objectData.department === "Asian Art" ||
                objectData.department === "Greek and Roman Art" ||
                objectData.department === "Egyptian Art" ||
                objectData.department === "Islamic Art" ||
                objectData.department === "Ancient Near Eastern Art";

              if (isChineseOrAsian || isScrollOrPainting || hasArtisticValue) {
                const tags: string[] = [];
                if (objectData.tags) {
                  if (typeof objectData.tags === 'string') {
                    tags.push(...objectData.tags.split(',').map((t: string) => t.trim()));
                  } else if (Array.isArray(objectData.tags)) {
                    tags.push(...objectData.tags.map((t: any) => typeof t === 'string' ? t : t.tag));
                  }
                }
                if (objectData.classification) tags.push(objectData.classification);
                if (objectData.culture) tags.push(objectData.culture);

                results.push({
                  id: objectData.objectID.toString(),
                  title: objectData.title || objectData.objectName || "无题",
                  artist: objectData.artistDisplayName || null,
                  dynasty: objectData.objectDate || null,
                  imageUrl: objectData.primaryImage,
                  thumbnail: objectData.primaryImageSmall || objectData.primaryImage,
                  description: objectData.objectDescription || objectData.medium || objectData.classification || null,
                  tags: tags.filter(Boolean),
                  culture: objectData.culture,
                  department: objectData.department,
                });
              }
            }
          }
        } catch (error) {
          console.error(`获取对象 ${objectID} 失败:`, error);
        }
      }
    }
  } catch (error) {
    console.error("大都会博物馆API调用失败:", error);
  }

  return results;
}

async function searchExistingPaintings(
  keywords: string[],
  theme: string,
  mood: string
): Promise<any[]> {
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
      take: 10,
    });
    return paintings;
  } catch (error) {
    console.error("搜索配图失败:", error);
    return [];
  }
}

async function saveMatchedPainting(
  paintingData: {
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
  }
): Promise<string> {
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

function calculateRelevance(
  painting: any,
  keywords: string[],
  theme: string,
  mood: string,
  imagery: string[]
): number {
  let score = 0;
  const titleLower = painting.title.toLowerCase();
  const tags = JSON.parse(painting.tags || "[]");
  const descriptionLower = (painting.description || "").toLowerCase();

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    if (titleLower.includes(keywordLower)) score += 0.25;
    if (tags.some((t: string) => t.toLowerCase().includes(keywordLower))) score += 0.2;
    if (descriptionLower.includes(keywordLower)) score += 0.1;
  }

  for (const img of imagery) {
    const imgLower = img.toLowerCase();
    if (titleLower.includes(imgLower)) score += 0.15;
    if (tags.some((t: string) => t.toLowerCase().includes(imgLower))) score += 0.1;
  }

  const themeKeywords = PAINTING_THEMES[theme] || [];
  if (themeKeywords.some((t) => titleLower.includes(t))) score += 0.15;

  const moodKeywords = PAINTING_MOODS[mood] || [];
  if (moodKeywords.some((t) => titleLower.includes(t))) score += 0.1;

  return Math.min(score, 1);
}

export async function POST(request: NextRequest) {
  try {
    const { title, body, tags, count = 4 } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: "请提供标题和正文" }, { status: 400 });
    }

    const analysisResult = await analyzeContentForPainting(title, body, tags);

    const existingPaintings = await searchExistingPaintings(
      analysisResult.keywords,
      analysisResult.theme,
      analysisResult.mood
    );

    const existingMatches: PaintingMatch[] = existingPaintings.map((painting) => ({
      id: painting.id,
      title: painting.title,
      artist: painting.artist,
      dynasty: painting.dynasty,
      url: painting.url,
      thumbnail: painting.thumbnail,
      description: painting.description,
      relevance: calculateRelevance(
        painting,
        analysisResult.keywords,
        analysisResult.theme,
        analysisResult.mood,
        analysisResult.imagery
      ),
      matchReason: analysisResult.matchReason,
      isNew: false,
    }));

    existingMatches.sort((a, b) => b.relevance - a.relevance);

    const selectedExisting = existingMatches.slice(0, Math.ceil(count / 2));

    const searchTerms = analysisResult.searchTerms || analysisResult.keywords;
    const externalPaintings = await fetchFromMetMuseum(
      searchTerms.slice(0, 2).join(" ")
    );

    const newMatches: PaintingMatch[] = [];

    for (const ext of externalPaintings.slice(0, count - selectedExisting.length)) {
      try {
        const paintingId = await saveMatchedPainting({
          title: ext.title || "无题",
          artist: ext.artist || null,
          dynasty: ext.dynasty || null,
          url: ext.imageUrl || ext.url || "",
          thumbnail: ext.thumbnail || ext.imageUrl || "",
          externalId: `met-${ext.id}`,
          externalSource: "metmuseum",
          description: ext.description || null,
          tags: [...analysisResult.imagery, analysisResult.theme, ...ext.tags],
          matchKeywords: analysisResult.keywords,
        });

        newMatches.push({
          id: paintingId,
          title: ext.title || "无题",
          artist: ext.artist || null,
          dynasty: ext.dynasty || null,
          url: ext.imageUrl || ext.url || "",
          thumbnail: ext.thumbnail || ext.imageUrl || "",
          description: ext.description || null,
          relevance: 0.8,
          matchReason: `契合「${analysisResult.imagery.slice(0, 2).join("·")}」意象`,
          isNew: true,
        });
      } catch (e) {
        console.error("保存外部配图失败:", e);
      }
    }

    let allMatches = [...selectedExisting, ...newMatches]
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, count);

    if (allMatches.length < 2) {
      for (const defaultPainting of DEFAULT_PAINTINGS.slice(0, count - allMatches.length)) {
        try {
          const paintingId = await saveMatchedPainting({
            title: defaultPainting.title,
            artist: defaultPainting.artist,
            dynasty: defaultPainting.dynasty,
            url: defaultPainting.url,
            thumbnail: defaultPainting.thumbnail,
            externalId: `default-${defaultPainting.title}`,
            externalSource: "default",
            description: defaultPainting.description,
            tags: defaultPainting.tags,
            matchKeywords: analysisResult.keywords,
          });

          allMatches.push({
            id: paintingId,
            title: defaultPainting.title,
            artist: defaultPainting.artist,
            dynasty: defaultPainting.dynasty,
            url: defaultPainting.url,
            thumbnail: defaultPainting.thumbnail,
            description: defaultPainting.description,
            relevance: 0.7,
            matchReason: "经典国画推荐",
            isNew: true,
          });
        } catch (e) {
          console.error("保存默认配图失败:", e);
        }
      }
    }

    return NextResponse.json({
      matches: allMatches,
      analysis: {
        keywords: analysisResult.keywords,
        theme: analysisResult.theme,
        mood: analysisResult.mood,
        style: analysisResult.style,
        imagery: analysisResult.imagery,
        matchReason: analysisResult.matchReason,
      },
      total: allMatches.length,
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "配图匹配失败";
    console.error("AI配图API错误:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
