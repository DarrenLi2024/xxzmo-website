import { NextRequest, NextResponse } from "next/server";
import { runAiTask } from "@/lib/ai-task";
import { paintingSearchKeywordsSchema } from "@/lib/ai-schemas";
import { PAINTING_SEARCH_PROMPT_VERSION } from "@/lib/prompts";

interface Painting {
  id: string;
  title: string;
  artist: string | null;
  dynasty: string | null;
  url: string;
  thumbnail: string | null;
  description: string | null;
  tags: string[];
  externalId: string;
  externalSource: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "0");
    const count = parseInt(searchParams.get("count") || "20");

    const keywords = query.trim() ? await analyzeSearchQuery(query) : [];
    
    const searchTerm = keywords.length > 0 ? keywords.join(" ") : 
      ["Chinese painting", "landscape painting", "ink painting", "scroll painting"][page % 4];

    const results = await fetchFromMetMuseum(searchTerm, count);

    const paintings: Painting[] = results.map((p: any) => ({
      id: `met-${p.id}`,
      title: p.title,
      artist: p.artist,
      dynasty: p.dynasty,
      url: p.imageUrl,
      thumbnail: p.thumbnail,
      description: p.description,
      tags: [...keywords, ...p.tags],
      externalId: `met-${p.id}`,
      externalSource: "metmuseum",
    }));

    return NextResponse.json({ paintings });
  } catch (error) {
    console.error("搜索配图失败:", error);
    return NextResponse.json({ paintings: [] });
  }
}

async function analyzeSearchQuery(query: string): Promise<string[]> {
  const systemPrompt = `你是一位中国古典艺术专家，请分析用户的搜索关键词，提取适合在艺术图库中检索的英文关键词。

只输出 JSON：{"keywords":["keyword1","keyword2","keyword3"]}`;

  const userMessage = `请分析以下搜索词，提取适合检索古典国画的英文关键词：${query}`;

  try {
    const result = await runAiTask(
      "painting.search",
      [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
      paintingSearchKeywordsSchema,
      { promptVersion: PAINTING_SEARCH_PROMPT_VERSION, temperature: 0.3, maxTokens: 120 }
    );
    return result.data.keywords.filter(Boolean);
  } catch {
    return [query];
  }
}

async function fetchFromMetMuseum(query: string, count: number): Promise<any[]> {
  const results: any[] = [];
  
  try {
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true&medium=Paintings`;
    
    const response = await fetch(searchUrl, { headers: { Accept: "application/json" } });
    
    if (response.ok) {
      const searchData = await response.json();
      const objectIDs = searchData.objectIDs || [];
      
      const shuffled = objectIDs.sort(() => Math.random() - 0.5);
      const toFetch = shuffled.slice(0, count * 2);

      for (const objectID of toFetch) {
        if (results.length >= count) break;
        
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
                 objectData.objectName.toLowerCase().includes("scroll"));

              const hasArtisticValue = objectData.department === "Asian Art";

              if (isChineseOrAsian || isScrollOrPainting || hasArtisticValue) {
                const tags: string[] = [];
                if (objectData.classification) tags.push(objectData.classification);
                if (objectData.culture) tags.push(objectData.culture);

                results.push({
                  id: objectData.objectID.toString(),
                  title: objectData.title || objectData.objectName || "无题",
                  artist: objectData.artistDisplayName || null,
                  dynasty: objectData.objectDate || null,
                  imageUrl: objectData.primaryImage,
                  thumbnail: objectData.primaryImageSmall || objectData.primaryImage,
                  description: objectData.objectDescription || objectData.medium || null,
                  tags: tags.filter(Boolean),
                });
              }
            }
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    console.error("Met Museum API调用失败");
  }

  return results;
}
