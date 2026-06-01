import { NextRequest, NextResponse } from "next/server";
import { getOrCreateFormatAnalysis, getStoredFormatAnalysis } from "@/lib/format-analysis";
import { getAdminFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminFromCookies())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await request.json();
    if (!articleId) {
      return NextResponse.json({ success: false, error: "缺少文章ID" }, { status: 400 });
    }

    const result = await getOrCreateFormatAnalysis(articleId);
    if ("error" in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, data: result.data, cached: result.cached });
  } catch {
    return NextResponse.json({ success: false, error: "格式分析失败" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminFromCookies())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const articleId = new URL(request.url).searchParams.get("articleId");
    if (!articleId) {
      return NextResponse.json({ success: false, error: "缺少文章ID" }, { status: 400 });
    }

    const result = await getStoredFormatAnalysis(articleId);
    if ("error" in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    if ("message" in result) {
      return NextResponse.json({ success: false, message: result.message });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch {
    return NextResponse.json({ success: false, error: "获取格式分析失败" }, { status: 500 });
  }
}
