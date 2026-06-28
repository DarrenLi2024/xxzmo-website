import { NextResponse } from "next/server";
import { backfillArticleIndex } from "@/lib/article-index-backfill";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const source = typeof body.source === "string" ? body.source : undefined;
    const limit = typeof body.limit === "number" ? body.limit : undefined;
    const mode = body.mode === "fingerprint" || body.mode === "embedding" || body.mode === "all"
      ? body.mode
      : "all";
    const onlyMissing = body.onlyMissing !== false;

    const result = await backfillArticleIndex({ source, limit, mode, onlyMissing });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "索引回填失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
