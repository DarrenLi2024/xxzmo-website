import { NextResponse } from "next/server";
import { findSimilarArticles } from "@/lib/ai-embedding";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || "10");
    const source = searchParams.get("source") || undefined;
    const minSimilarity = Number(searchParams.get("minSimilarity") || "0.75");

    const articles = await findSimilarArticles(id, {
      limit: Number.isFinite(limit) ? limit : 10,
      source,
      minSimilarity: Number.isFinite(minSimilarity) ? minSimilarity : 0.75,
    });

    return NextResponse.json({ articles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "相似召回失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
