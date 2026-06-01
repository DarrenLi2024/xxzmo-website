import { NextResponse } from "next/server";
import { getAiTaskStats } from "@/lib/ai-task";

export async function GET() {
  const tasks = await getAiTaskStats();
  return NextResponse.json({ tasks });
}
