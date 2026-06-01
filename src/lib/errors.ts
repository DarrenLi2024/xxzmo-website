import { NextResponse } from "next/server";

/**
 * Unified error handling for API routes.
 * Logs errors server-side and returns a safe error response to clients.
 */
export function safeErrorResponse(
  error: unknown,
  ctx: string,
  status = 500
): NextResponse {
  const message = error instanceof Error ? error.message : "操作失败";
  console.error(`[${ctx}]`, error);
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * Log error without exposing details to client.
 * Use this when you want to log but return a generic message.
 */
export function logError(error: unknown, ctx: string): void {
  if (error instanceof Error) {
    console.error(`[${ctx}] ${error.name}: ${error.message}`);
    if (process.env.NODE_ENV !== "production") {
      console.error(error.stack);
    }
  } else {
    console.error(`[${ctx}]`, error);
  }
}