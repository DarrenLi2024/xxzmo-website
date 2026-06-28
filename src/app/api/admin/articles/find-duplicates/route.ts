import { NextResponse } from "next/server";
import { findDuplicatePairs } from "@/lib/article-dedup";

export async function POST(request: Request) {
  try {
    const { source, threshold = 0.85 } = await request.json();
    const result = await findDuplicatePairs({ source, threshold });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "检测失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
