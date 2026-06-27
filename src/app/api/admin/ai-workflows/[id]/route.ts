import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await prisma.aiWorkflowRun.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: "asc" } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取任务详情失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
