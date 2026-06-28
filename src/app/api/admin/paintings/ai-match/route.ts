import { NextRequest, NextResponse } from "next/server";
import { recommendPaintingsForPoem } from "@/lib/painting-match";

/** AI 配图推荐：仅从本地配图库返回候选，不自动绑定 */
export async function POST(request: NextRequest) {
  try {
    const { title, body, tags, count = 4 } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: "请提供标题和正文" }, { status: 400 });
    }

    const result = await recommendPaintingsForPoem({
      title,
      body,
      tags: Array.isArray(tags) ? tags : [],
      count,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "配图推荐失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
