import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeArticleAdmin } from "@/lib/serialize";
import { updateArticleTags } from "@/lib/tag-service";
import { logAdminAction } from "@/lib/admin-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } }, painting: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(serializeArticleAdmin(article));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tags, ...rawData } = body;

    const data: Record<string, unknown> = {};
    const fieldKeys = [
      "title", "body", "author", "dateRaw", "preface", "postscript",
      "notes", "status", "translation", "appreciation", "annotations",
      "paintingId",
    ];
    for (const key of fieldKeys) {
      if (rawData[key] !== undefined) data[key] = rawData[key];
    }
    if (data.paintingId !== undefined) {
      data.paintingId = await validateLocalPaintingId(data.paintingId);
    }
    if (["title", "author", "body"].some((key) => rawData[key] !== undefined)) {
      data.pinyin = null;
    }

    if (Array.isArray(tags)) {
      const cleanTags = tags.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0);
      await updateArticleTags(id, cleanTags);
      data.tagList = JSON.stringify(cleanTags);
    }

    const article = await prisma.article.update({
      where: { id },
      data,
    });

    await logAdminAction({
      action: "article.update",
      entityType: "article",
      entityId: article.id,
      summary: `更新文章「${article.title}」`,
      metadata: { fields: Object.keys(data) },
    });

    return NextResponse.json(article);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function validateLocalPaintingId(value: unknown): Promise<string | null> {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("配图 ID 无效");
  const painting = await prisma.painting.findUnique({
    where: { id: value },
    select: { id: true, url: true },
  });
  if (!painting || !painting.url) {
    throw new Error("只能选择本地上传配图");
  }
  return painting.id;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const article = await prisma.article.delete({ where: { id } });
    await logAdminAction({
      action: "article.delete",
      entityType: "article",
      entityId: id,
      summary: `删除文章「${article.title}」`,
      metadata: { source: article.source, status: article.status },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
