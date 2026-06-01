import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  let quote = await prisma.dailyQuote.findUnique({ where: { dateKey: today } });
  if (quote) return NextResponse.json(quote);

  // Fallback: pick random article first line
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

  return NextResponse.json({
    content: "待山房主人挥毫...",
    source: "ai_generated",
    dateKey: today,
  });
}
