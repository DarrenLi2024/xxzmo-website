import "server-only";
import { prisma } from "@/lib/prisma";
import { generateDailyQuote } from "@/lib/daily-quote-ai";

export interface DailyQuoteData {
  content: string;
  source: string;
  sourceRef?: string | null;
  dateKey: string;
}

export async function getOrCreateDailyQuote(): Promise<DailyQuoteData> {
  const today = new Date().toISOString().slice(0, 10);

  const existing = await prisma.dailyQuote.findUnique({ where: { dateKey: today } });
  if (existing) return existing;

  const config = await prisma.siteConfig.findFirst({
    select: { quoteSource: true, quoteAiStyle: true },
  });
  const quoteSource = config?.quoteSource || "collection_first";

  if (quoteSource !== "ai_only") {
    const article = await prisma.article.findFirst({
      where: { source: "chuli", status: "published" },
      orderBy: { publishedAt: "desc" },
    });

    if (article) {
      const firstLine = article.body.split("\n")[0].replace(/[，。！？；、]/g, "").slice(0, 30);
      return prisma.dailyQuote.create({
        data: {
          content: firstLine,
          source: "from_collection",
          sourceRef: article.slug,
          dateKey: today,
        },
      });
    }
  }

  if (quoteSource === "ai_only" || quoteSource === "collection_first") {
    try {
      const providerCount = await prisma.llmProvider.count({ where: { enabled: true } });
      if (providerCount > 0) {
        const generated = await generateDailyQuote(config?.quoteAiStyle || "");
        return prisma.dailyQuote.create({
          data: {
            content: generated.content,
            source: "ai_generated",
            aiPrompt: generated.aiPrompt,
            dateKey: today,
          },
        });
      }
    } catch (error) {
      console.warn("[daily-quote] AI generation failed:", error);
    }
  }

  return {
    content: "待山房主人挥毫...",
    source: "ai_generated",
    dateKey: today,
  };
}
