import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function GET() {
  const paintings = await prisma.painting.findMany({
    where: {
      url: { startsWith: "/paintings/" },
    },
    orderBy: { createdAt: "desc" },
  });
  const list = paintings.map((p) => ({
    ...p,
    tags: JSON.parse(p.tags as string) as string[],
  }));
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminFromCookies())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "仅支持 JPG/PNG/WebP/GIF 格式" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "文件大小不能超过 10MB" },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${randomUUID()}${ext}`;

    // Ensure the paintings directory exists
    const uploadDir = path.join(process.cwd(), "public", "paintings");
    await mkdir(uploadDir, { recursive: true });

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Extract title from original filename (strip extension)
    const title = path.basename(file.name, ext) || "未命名配图";

    // Create database record
    const painting = await prisma.painting.create({
      data: {
        title,
        url: `/paintings/${filename}`,
        tags: "[]",
      },
    });

    return NextResponse.json(
      { ...painting, tags: [] as string[] },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
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
      return NextResponse.json({ error: "缺少配图 ID" }, { status: 400 });
    }

    const painting = await prisma.painting.findUnique({ where: { id } });
    if (!painting) {
      return NextResponse.json({ error: "配图不存在" }, { status: 404 });
    }

    // Unlink articles referencing this painting
    await prisma.article.updateMany({
      where: { paintingId: id },
      data: { paintingId: null },
    });

    // Delete the database record
    await prisma.painting.delete({ where: { id } });

    // Try to delete the file from disk (best-effort)
    try {
      const filePath = path.join(process.cwd(), "public", painting.url);
      await unlink(filePath);
    } catch {
      // File might not exist on disk (e.g. seeded data), ignore
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
