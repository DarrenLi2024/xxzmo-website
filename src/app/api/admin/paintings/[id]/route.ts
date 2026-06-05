import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const painting = await prisma.painting.findUnique({
      where: { id },
    });

    if (!painting || !painting.url.startsWith("data:")) {
      return NextResponse.json({ error: "配图不存在" }, { status: 404 });
    }

    return NextResponse.json({
      ...painting,
      tags: JSON.parse(painting.tags as string) as string[],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取配图失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
