import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: 10 likes per minute per IP
  const rateLimit = checkRateLimit(rateLimitKey(request, "like"), 10, 60000);
  if (!rateLimit.allowed) {
    return rateLimitResponse("操作过于频繁，请稍后再试", rateLimit);
  }

  const { slug, action } = await request.json();

  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const article = await prisma.article.findFirst({ where: { slug, status: "published" } });
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "like") {
    await prisma.article.update({
      where: { id: article.id },
      data: { likeCount: { increment: 1 } },
    });
    return NextResponse.json({ slug, likeCount: article.likeCount + 1 });
  }

  if (action === "unlike" && article.likeCount > 0) {
    await prisma.article.update({
      where: { id: article.id },
      data: { likeCount: { decrement: 1 } },
    });
    return NextResponse.json({ slug, likeCount: article.likeCount - 1 });
  }

  return NextResponse.json({ slug, likeCount: article.likeCount });
}

export async function GET(request: NextRequest) {
  // Rate limit: 60 reads per minute per IP
  const rateLimit = checkRateLimit(rateLimitKey(request, "like-read"), 60, 60000);
  if (!rateLimit.allowed) {
    return rateLimitResponse("请求过于频繁，请稍后再试", rateLimit);
  }

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const article = await prisma.article.findFirst({
    where: { slug, status: "published" },
    select: { likeCount: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ slug, likeCount: article.likeCount });
}
