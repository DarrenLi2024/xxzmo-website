import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getConnectionString(): string {
  // Priority: POSTGRES_PRISMA_URL (Supabase/Neon pooler) > DATABASE_URL
  // On Vercel, POSTGRES_PRISMA_URL is injected as a Runtime env var
  const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "";
  if (!url) {
    throw new Error(
      "[prisma] Neither POSTGRES_PRISMA_URL nor DATABASE_URL is configured. " +
      "Please set POSTGRES_PRISMA_URL in Vercel Environment Variables."
    );
  }
  return url;
}

function createPrismaClient() {
  const connectionString = getConnectionString();
  const isPostgres = connectionString.startsWith("postgresql://");

  let url = connectionString;

  if (isPostgres) {
    // Ensure connection parameters for Supabase PgBouncer pooler compatibility
    try {
      const [base, qs = ""] = connectionString.split("?");
      const params = new URLSearchParams(qs);
      if (!params.has("pgbouncer")) params.set("pgbouncer", "true");
      if (!params.has("connection_limit")) params.set("connection_limit", "1");
      if (!params.has("pool_timeout")) params.set("pool_timeout", "20");
      url = `${base}?${params.toString()}`;
    } catch {
      // fallback to raw url
      url = connectionString;
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[prisma] Connecting to: ${url.split("?")[0]}`);
  }

  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  });
}

// Production (Vercel Serverless): always create a fresh client
// Development: cache on globalThis to survive HMR
export const prisma = 
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (globalForPrisma.prisma ??= createPrismaClient());
