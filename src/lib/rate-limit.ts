import { NextRequest, NextResponse } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
let lastCleanup = Date.now();

function lazyCleanup() {
  const now = Date.now();
  // Only clean up every 60 seconds max
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetTime) rateLimitMap.delete(key);
  });
}

export function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  lazyCleanup();
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}

export function getClientIp(request: NextRequest): string {
  const trustedHeader = process.env.TRUSTED_CLIENT_IP_HEADER || "x-forwarded-for";
  const rawHeader = request.headers.get(trustedHeader);
  const forwardedIp = rawHeader?.split(",")[0]?.trim();
  const directIp = request.headers.get("x-real-ip")?.trim();
  return forwardedIp || directIp || "unknown";
}

export function rateLimitKey(request: NextRequest, scope: string): string {
  return `${scope}:${getClientIp(request)}`;
}

export function rateLimitHeaders(result: { remaining: number; resetTime: number }): HeadersInit {
  return {
    "RateLimit-Remaining": result.remaining.toString(),
    "RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
  };
}

export function rateLimitResponse(
  message: string,
  result: { remaining: number; resetTime: number }
) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        "Retry-After": Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000)).toString(),
      },
    }
  );
}
