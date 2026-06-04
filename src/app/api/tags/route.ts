import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { count: "desc" },
    include: { _count: { select: { articles: true } } },
  });
  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminFromCookies())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "标签名不能为空" }, { status: 400 });
    }

    const trimmed = name.trim();

    const existing = await prisma.tag.findUnique({ where: { name: trimmed } });
    if (existing) {
      return NextResponse.json({ error: "标签已存在" }, { status: 409 });
    }

    const tag = await prisma.tag.create({ data: { name: trimmed } });
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await getAdminFromCookies())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name } = await request.json();

    if (!id || !name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const trimmed = name.trim();

    // Check if another tag already has this name
    const existing = await prisma.tag.findUnique({ where: { name: trimmed } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "该标签名已存在" }, { status: 409 });
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: { name: trimmed },
    });
    return NextResponse.json(tag);
  } catch (error) {
    const message = error instanceof Error ? error.message : "重命名失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await getAdminFromCookies())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少标签 ID" }, { status: 400 });
    }

    // Delete all tag-article associations first (cascade should handle this,
    // but be explicit), then delete the tag
    await prisma.$transaction([
      prisma.tagOnArticle.deleteMany({ where: { tagId: id } }),
      prisma.tag.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
