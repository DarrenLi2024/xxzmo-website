import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface DuplicatePair {
  id1: string;
  title1: string;
  id2: string;
  title2: string;
  similarity: number;
  type: "exact" | "similar";
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

function calculateSimilarity(str1: string, str2: string): number {
  const longer = Math.max(str1.length, str2.length);
  const shorter = Math.min(str1.length, str2.length);
  if (longer === 0) return 1.0;
  const editDistance = levenshteinDistance(str1, str2);
  return (longer - editDistance) / longer;
}

export async function POST(request: Request) {
  try {
    const { source, threshold = 0.85 } = await request.json();

    const where: Record<string, unknown> = {};
    if (source) where.source = source;

    const articles = await prisma.article.findMany({
      where,
      select: {
        id: true,
        title: true,
        body: true,
        preface: true,
        postscript: true,
      },
    });

    const duplicates: DuplicatePair[] = [];
    const n = articles.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a1 = articles[i];
        const a2 = articles[j];

        const fullText1 = `${a1.title}${a1.preface || ""}${a1.body}${a1.postscript || ""}`;
        const fullText2 = `${a2.title}${a2.preface || ""}${a2.body}${a2.postscript || ""}`;

        const similarity = calculateSimilarity(fullText1, fullText2);

        if (similarity >= threshold) {
          duplicates.push({
            id1: a1.id,
            title1: a1.title,
            id2: a2.id,
            title2: a2.title,
            similarity,
            type: similarity >= 0.98 ? "exact" : "similar",
          });
        }
      }
    }

    duplicates.sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json({
      duplicates,
      total: duplicates.length,
      threshold,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "检测失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
