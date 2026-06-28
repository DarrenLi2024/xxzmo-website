import { NextRequest, NextResponse } from "next/server";
import { retryWorkflow } from "@/lib/ai-workflow";
import { kickAiWorker } from "@/lib/ai-worker-kick";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await retryWorkflow(id);
    kickAiWorker(1);
    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "重试任务失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
