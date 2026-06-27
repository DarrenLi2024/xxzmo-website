import { NextRequest, NextResponse } from "next/server";
import { getRunArtifacts } from "@/lib/ai-artifact";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artifacts = await getRunArtifacts(id);
    return NextResponse.json({ artifacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取产物失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
