import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/search-server";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(rateLimitKey(request, "search"), 30, 60000);
  if (!rateLimit.allowed) {
    return rateLimitResponse("搜索过于频繁，请稍后再试", rateLimit);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const tag = searchParams.get("tag");

  const articles = await searchArticles(q, tag || undefined);

  return NextResponse.json(
    { articles, total: articles.length },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
