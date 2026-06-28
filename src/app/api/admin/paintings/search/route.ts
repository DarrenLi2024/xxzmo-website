import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 本地配图库搜索（关键词匹配标题/标签） */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    const paintings = await prisma.painting.findMany({
      where: q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { artist: { contains: q, mode: "insensitive" } },
              { tags: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { matchCount: "desc" },
      take: 20,
    });

    return NextResponse.json({ paintings, total: paintings.length, mode: "local" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "搜索失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
