import { NextResponse } from "next/server";
import { splitArticles, parseSingleArticle, findDuplicates } from "../utils";

interface ParsedArticle {
  id: string;
  title: string;
  body: string;
  type: string;
  subType?: string;
  confidence: number;
  classificationReasons?: string[];
}

export async function POST(request: Request) {
  try {
    const { text, separator, defaultType } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "请提供待解析的文本" }, { status: 400 });
    }

    // 智能分篇
    const { blocks, strategy } = splitArticles(text, separator);
    
    // 解析每篇文章
    const parsedArticles: ParsedArticle[] = blocks.map((block: string, index: number) => {
      const article = parseSingleArticle(block, defaultType || "诗");
      return {
        id: `parse-${index}-${Date.now()}`,
        title: article.title,
        body: article.body,
        type: article.type,
        subType: article.subType,
        confidence: article.confidence,
        classificationReasons: article.classificationReasons,
      };
    });

    // 查找重复内容
    const duplicates = findDuplicates(parsedArticles);

    return NextResponse.json({
      articles: parsedArticles,
      duplicates,
      strategy,
      count: parsedArticles.length,
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "解析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
