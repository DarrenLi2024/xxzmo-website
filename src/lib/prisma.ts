import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Supabase PostgreSQL (via PgBouncer pooler on port 6543)
  const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "";

  let adjustedUrl = connectionString;

  // Supabase pooler already manages connections, but we add pgbouncer=true 
  // for Prisma compatibility with transaction mode pooler
  if (connectionString.startsWith("postgresql://")) {
    const params = new URLSearchParams(
      connectionString.includes("?") ? connectionString.split("?")[1] : ""
    );
    params.set("pgbouncer", "true");
    params.set("connection_limit", "1");
    params.set("pool_timeout", "10");
    const base = connectionString.split("?")[0];
    adjustedUrl = `${base}?${params.toString()}`;
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: adjustedUrl,
      },
    },
    log: process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
