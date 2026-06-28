import { prisma } from "@/lib/prisma";
import { runAiTask } from "@/lib/ai-task";
import { paintingAnalysisSchema } from "@/lib/ai-schemas";
import { PAINTING_MATCH_PROMPT_VERSION } from "@/lib/prompts";

export interface PaintingMatchCandidate {
  id: string;
  title: string;
  artist: string | null;
  dynasty: string | null;
  url: string;
  thumbnail: string | null;
  description: string | null;
  relevance: number;
  matchReason: string;
}

const PAINTING_THEMES: Record<string, string[]> = {
  山水: ["山", "水", "江", "河", "峰", "岭"],
  花鸟: ["梅", "兰", "竹", "菊", "鸟", "花"],
  人物: ["人", "仕", "童", "行"],
  隐逸: ["隐", "渔", "樵", "闲"],
};

function calculateRelevance(
  painting: { title: string; tags: string; description: string | null; matchKeywords: string | null },
  keywords: string[],
  theme: string,
  imagery: string[]
): number {
  let score = 0;
  const title = painting.title;
  const tags: string[] = JSON.parse(painting.tags || "[]");
  const description = painting.description || "";
  const matchKeywords: string[] = JSON.parse(painting.matchKeywords || "[]");

  for (const keyword of [...keywords, ...imagery]) {
    if (!keyword) continue;
    if (title.includes(keyword)) score += 0.2;
    if (tags.some((t) => t.includes(keyword))) score += 0.15;
    if (description.includes(keyword)) score += 0.1;
    if (matchKeywords.some((t) => t.includes(keyword))) score += 0.1;
  }

  const themeHints = PAINTING_THEMES[theme] || [];
  if (themeHints.some((hint) => title.includes(hint) || tags.some((t) => t.includes(hint)))) {
    score += 0.15;
  }

  return Math.min(score, 1);
}

async function analyzePoemForPainting(title: string, body: string, tags: string[]) {
  try {
    const result = await runAiTask(
      "painting.match",
      [
        {
          role: "system",
          content: `你是中国古典文学与国画专家。分析诗文配图需求，只输出 JSON：
{"keywords":[],"theme":"山水","mood":"恬淡","style":"水墨","matchReason":"15字内","imagery":[],"searchTerms":[]}`,
        },
        {
          role: "user",
          content: `【标题】${title}\n【正文】${body}\n【标签】${tags.join(", ") || "无"}`,
        },
      ],
      paintingAnalysisSchema,
      {
        promptVersion: PAINTING_MATCH_PROMPT_VERSION,
        temperature: 0.4,
        maxTokens: 800,
      }
    );
    return result.data;
  } catch {
    return {
      keywords: tags.slice(0, 5),
      theme: "山水",
      mood: "恬淡",
      style: "水墨",
      matchReason: "基于标签推荐",
      imagery: tags.slice(0, 3),
      searchTerms: tags.slice(0, 3),
    };
  }
}

/** 从本地配图库推荐候选（不自动绑定、不拉取外部图源） */
export async function recommendPaintingsForPoem(input: {
  title: string;
  body: string;
  tags?: string[];
  count?: number;
}) {
  const tags = input.tags || [];
  const count = Math.max(1, Math.min(input.count || 4, 8));
  const analysis = await analyzePoemForPainting(input.title, input.body, tags);

  const paintings = await prisma.painting.findMany({
    orderBy: { matchCount: "desc" },
    take: 100,
  });

  const matches: PaintingMatchCandidate[] = paintings
    .map((painting) => ({
      id: painting.id,
      title: painting.title,
      artist: painting.artist,
      dynasty: painting.dynasty,
      url: painting.url,
      thumbnail: painting.thumbnail,
      description: painting.description,
      relevance: calculateRelevance(
        painting,
        analysis.keywords,
        analysis.theme,
        analysis.imagery || []
      ),
      matchReason: analysis.matchReason || "意境相近",
    }))
    .filter((item) => item.relevance > 0.1)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, count);

  return {
    matches,
    analysis: {
      keywords: analysis.keywords,
      theme: analysis.theme,
      mood: analysis.mood,
      style: analysis.style,
      imagery: analysis.imagery || [],
      matchReason: analysis.matchReason,
    },
    total: matches.length,
    mode: "local-recommend" as const,
  };
}
