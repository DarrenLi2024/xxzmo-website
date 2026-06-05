import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { put, del } from "@vercel/blob";

export async function GET() {
  const paintings = await prisma.painting.findMany({
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

    // Extract title from original filename
    const dotIndex = file.name.lastIndexOf(".");
    const title =
      dotIndex > 0 ? file.name.substring(0, dotIndex) : "未命名配图";
    const ext = dotIndex > 0 ? file.name.substring(dotIndex) : ".jpg";

    // Upload to Vercel Blob
    // In Vercel environment, BLOB_READ_WRITE_TOKEN is auto-injected by the Blob integration.
    // In local dev (token absent), we fall back to Base64 data URL.
    let url: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(
        `paintings/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`,
        file,
        { access: "public" }
      );
      url = blob.url;
    } else {
      // Local dev fallback
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      const mimeType = file.type || "image/png";
      url = `data:${mimeType};base64,${base64}`;
    }

    // Create database record
    const painting = await prisma.painting.create({
      data: {
        title,
        url,
        tags: "[]",
      },
    });

    return NextResponse.json(
      { ...painting, tags: [] as string[] },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    console.error("[paintings] POST error:", message);
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

    // Delete from Vercel Blob (best-effort)
    if (painting.url.startsWith("https://") && painting.url.includes("public.blob.vercel-storage.com")) {
      try {
        await del(painting.url);
      } catch {
        // best-effort cleanup
      }
    }

    // Delete the database record
    await prisma.painting.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    console.error("[paintings] DELETE error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
