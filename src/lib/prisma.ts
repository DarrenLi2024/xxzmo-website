import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getConnectionString(): string {
  const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "";
  if (!url) {
    throw new Error(
      "[prisma] Neither POSTGRES_PRISMA_URL nor DATABASE_URL is configured."
    );
  }
  return url;
}

function normalizePostgresUrl(connectionString: string): string {
  try {
    const urlObj = new URL(connectionString);

    // Session mode pooler (port 5432): no pgbouncer flag needed
    if (urlObj.port === "5432") {
      urlObj.searchParams.delete("pgbouncer");
    } else if (!urlObj.searchParams.has("pgbouncer")) {
      // Transaction mode pooler (port 6543): needs pgbouncer=true
      urlObj.searchParams.set("pgbouncer", "true");
    }

    const currentLimit = Number(urlObj.searchParams.get("connection_limit") || "0");
    // Vercel/Supabase 常带 connection_limit=1，首页并发查询会排队超时
    if (!Number.isFinite(currentLimit) || currentLimit < 5) {
      urlObj.searchParams.set("connection_limit", "5");
    }

    const currentTimeout = Number(urlObj.searchParams.get("pool_timeout") || "0");
    if (!Number.isFinite(currentTimeout) || currentTimeout < 20) {
      urlObj.searchParams.set("pool_timeout", "20");
    }

    return urlObj.toString();
  } catch {
    return connectionString;
  }
}

function createPrismaClient() {
  const connectionString = getConnectionString();
  const isPostgres = connectionString.startsWith("postgresql://");

  const url = isPostgres
    ? normalizePostgresUrl(connectionString)
    : connectionString;

  return new PrismaClient({
    datasourceUrl: url,
    log: ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
