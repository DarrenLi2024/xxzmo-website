import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { id: "site" } });
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Only allow updating known fields
    const allowedFields = [
      "siteName",
      "seoDesc",
      "authorName",
      "authorTitle",
      "bio",
      "signature",
      "avatarUrl",
      "homeChuliCount",
      "showStats",
      "quoteSource",
      "quoteAiStyle",
      "importSeparator",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "无有效字段" }, { status: 400 });
    }

    // Validate siteName is not empty if provided
    if (data.siteName !== undefined && (!data.siteName || typeof data.siteName !== "string" || !(data.siteName as string).trim())) {
      return NextResponse.json({ error: "站点名称不能为空" }, { status: 400 });
    }

    const config = await prisma.siteConfig.upsert({
      where: { id: "site" },
      update: data,
      create: { id: "site", ...data } as Parameters<typeof prisma.siteConfig.create>[0]["data"],
    });

    return NextResponse.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}