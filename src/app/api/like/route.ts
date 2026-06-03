import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitKey, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

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

  if (action !== "like" && action !== "unlike") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const article = await prisma.article.findFirst({ where: { slug, status: "published" } });
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Dedup: prevent duplicate likes from the same IP for the same article
  // Rate-limit 1 like per IP per article per 24 hours
  const clientIp = getClientIp(request);
  const dedupKey = `like:${clientIp}:${article.id}`;
  const dedupCheck = checkRateLimit(dedupKey, 1, 1000 * 60 * 60 * 24);

  if (action === "like" && !dedupCheck.allowed) {
    return NextResponse.json({ slug, likeCount: article.likeCount, alreadyLiked: true });
  }

  if (action === "unlike" && dedupCheck.allowed) {
    return NextResponse.json({ slug, likeCount: article.likeCount });
  }

  // Atomic increment / decrement with a floor of 0
  if (action === "like") {
    const updated = await prisma.article.update({
      where: { id: article.id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    });
    return NextResponse.json({ slug, likeCount: updated.likeCount });
  }

  if (action === "unlike") {
    const updated = await prisma.article.update({
      where: { id: article.id, likeCount: { gt: 0 } },
      data: { likeCount: { decrement: 1 } },
      select: { likeCount: true },
    });
    return NextResponse.json({ slug, likeCount: updated.likeCount });
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
