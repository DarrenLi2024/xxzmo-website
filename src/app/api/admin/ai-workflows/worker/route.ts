import { NextRequest, NextResponse } from "next/server";
import { runWorkflowWorker } from "@/lib/ai-workflow";
import { checkCronAuth } from "@/lib/cron-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const maxRuns = typeof body.maxRuns === "number" ? Math.max(1, Math.min(body.maxRuns, 5)) : 1;
    const result = await runWorkflowWorker({ maxRuns });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "执行 AI worker 失败";
    console.error("[worker] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Explicitly validate cron auth for GET requests (used by Vercel Cron)
    // The middleware already handles this, but we double-check for defense in depth
    const isCron = checkCronAuth(request);
    const userAgent = request.headers.get("user-agent") || "";
    const isVercelCron = userAgent.includes("vercel") || request.headers.get("x-vercel-cron") === "1";

    if (!isCron && !isVercelCron) {
      console.warn("[worker] Unauthorized GET request to worker endpoint", {
        ip: request.headers.get("x-forwarded-for"),
        ua: userAgent,
      });
      return NextResponse.json({ error: "Unauthorized: cron only" }, { status: 401 });
    }

    const result = await runWorkflowWorker({ maxRuns: 1 });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "执行 AI worker 失败";
    console.error("[worker] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
