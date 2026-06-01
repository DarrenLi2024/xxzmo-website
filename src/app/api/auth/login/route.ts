import { NextRequest, NextResponse } from "next/server";
import { sha256 } from "@/lib/utils";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { createAdminToken, createTokenCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(rateLimitKey(request, "auth"), 5, 60000);
  if (!rateLimit.allowed) {
    return rateLimitResponse("请求过于频繁，请稍后再试", rateLimit);
  }

  const { password } = await request.json();
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!password) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  if (!expectedHash) {
    console.error("[auth] ADMIN_PASSWORD_HASH is not configured");
    return NextResponse.json({ error: "认证配置错误，请联系管理员" }, { status: 500 });
  }

  if (await sha256(password) === expectedHash) {
    try {
      const token = await createAdminToken();
      const response = NextResponse.json({ success: true });
      response.cookies.set("admin_token", token, createTokenCookieOptions());
      return response;
    } catch (error) {
      console.error("[auth] Failed to create admin session", error);
      return NextResponse.json({ error: "认证配置错误，请联系管理员" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "密码错误" }, { status: 401 });
}
