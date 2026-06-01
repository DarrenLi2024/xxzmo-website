import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";
const EXPIRATION_TIME = "24h";
const MIN_SECRET_LENGTH = 32;

let cachedSecretKey: Uint8Array | null = null;

export interface AdminTokenPayload extends JWTPayload {
  sub: string;
  type: "admin";
}

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ sub: "admin", type: "admin" } as AdminTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION_TIME)
    .sign(getSecretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as AdminTokenPayload;
  } catch {
    return null;
  }
}

export async function getAdminFromCookies(): Promise<AdminTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function isAuthenticated(token: string | undefined): boolean {
  // For middleware synchronous use - we pass the already-verified token
  return !!token;
}

export function createTokenCookieOptions(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function getSecretKey(): Uint8Array {
  if (cachedSecretKey) return cachedSecretKey;

  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= MIN_SECRET_LENGTH) {
    cachedSecretKey = new TextEncoder().encode(secret);
    return cachedSecretKey;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters in production`);
  }

  const devSecret = process.env.ADMIN_PASSWORD_HASH?.slice(0, MIN_SECRET_LENGTH).padEnd(MIN_SECRET_LENGTH, "0")
    || "development-only-secret-key-change-me";
  cachedSecretKey = new TextEncoder().encode(devSecret);
  return cachedSecretKey;
}
