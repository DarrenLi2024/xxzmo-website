import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { paintings } = await request.json();

    if (!Array.isArray(paintings) || paintings.length === 0) {
      return NextResponse.json({ error: "缺少配图数据" }, { status: 400 });
    }

    const results = {
      success: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const painting of paintings) {
      try {
        const existing = await prisma.painting.findUnique({
          where: { externalId: painting.externalId },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await prisma.painting.create({
          data: {
            title: painting.title,
            artist: painting.artist || null,
            dynasty: painting.dynasty || null,
            url: painting.url,
            thumbnail: painting.thumbnail || painting.url,
            description: painting.description || null,
            tags: JSON.stringify(painting.tags || []),
            externalId: painting.externalId,
            externalSource: painting.externalSource,
            matchCount: 0,
          },
        });

        results.success++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "处理失败";
        results.errors.push(`${message}: ${painting.title}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入配图失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
