import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, createTokenCookieOptions } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("admin_token")?.value;

  // Protect admin pages (except login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const payload = token ? await verifyAdminToken(token) : null;
    if (!payload) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect admin API routes
  if (pathname.startsWith("/api/admin")) {
    const payload = token ? await verifyAdminToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};