import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDailyQuote } from "@/lib/daily-quote-ai";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  let quote = await prisma.dailyQuote.findUnique({ where: { dateKey: today } });
  if (quote) return NextResponse.json(quote);

  const config = await prisma.siteConfig.findFirst({
    select: { quoteSource: true, quoteAiStyle: true },
  });
  const quoteSource = config?.quoteSource || "collection_first";

  // 馆藏优先：先尝试从已发布文章取首行
  if (quoteSource !== "ai_only") {
    const article = await prisma.article.findFirst({
      where: { source: "chuli", status: "published" },
      orderBy: { publishedAt: "desc" },
    });

    if (article) {
      const firstLine = article.body.split("\n")[0].replace(/[，。！？；、]/g, "").slice(0, 30);
      quote = await prisma.dailyQuote.create({
        data: {
          content: firstLine,
          source: "from_collection",
          sourceRef: article.slug,
          dateKey: today,
        },
      });
      return NextResponse.json(quote);
    }
  }

  // AI 生成：ai_only 或馆藏为空时的 fallback
  if (quoteSource === "ai_only" || quoteSource === "collection_first") {
    try {
      const providerCount = await prisma.llmProvider.count({ where: { enabled: true } });
      if (providerCount > 0) {
        const generated = await generateDailyQuote(config?.quoteAiStyle || "");
        quote = await prisma.dailyQuote.create({
          data: {
            content: generated.content,
            source: "ai_generated",
            aiPrompt: generated.aiPrompt,
            dateKey: today,
          },
        });
        return NextResponse.json(quote);
      }
    } catch (error) {
      console.warn("[daily-quote] AI generation failed:", error);
    }
  }

  return NextResponse.json({
    content: "待山房主人挥毫...",
    source: "ai_generated",
    dateKey: today,
  });
}
