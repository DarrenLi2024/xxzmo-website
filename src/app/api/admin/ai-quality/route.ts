import { NextResponse } from "next/server";
import { getAiQualityReport } from "@/lib/ai-quality";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") || "30");
    const report = await getAiQualityReport(Number.isFinite(days) ? days : 30);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取质量报告失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
