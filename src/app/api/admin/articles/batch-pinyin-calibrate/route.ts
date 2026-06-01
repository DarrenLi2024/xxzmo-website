import { NextRequest, NextResponse } from "next/server";
import { calibrateArticlePinyin } from "@/lib/pinyin-calibration";

export async function POST(request: NextRequest) {
  try {
    const { articleIds } = await request.json();
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "缺少文章ID列表" }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      corrections: 0,
      uncertain: 0,
      items: [] as Array<{
        articleId: string;
        status: "success" | "failed";
        correctionCount?: number;
        uncertainCount?: number;
        reason?: string;
      }>,
    };

    for (const articleId of articleIds) {
      try {
        const result = await calibrateArticlePinyin(articleId);
        results.success += 1;
        results.corrections += result.correctionCount;
        results.uncertain += result.uncertainCount;
        results.items.push({
          articleId,
          status: "success",
          correctionCount: result.correctionCount,
          uncertainCount: result.uncertainCount,
        });
      } catch (error) {
        results.failed += 1;
        results.items.push({
          articleId,
          status: "failed",
          reason: error instanceof Error ? error.message : "拼音语境校准失败",
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量拼音语境校准失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
