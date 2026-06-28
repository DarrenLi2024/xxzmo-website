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

function createPrismaClient() {
  const connectionString = getConnectionString();
  const isPostgres = connectionString.startsWith("postgresql://");

  let url = connectionString;

  if (isPostgres) {
    try {
      const urlObj = new URL(connectionString);

      // Session mode pooler (port 5432): no pgbouncer flag needed
      if (urlObj.port === "5432") {
        urlObj.searchParams.delete("pgbouncer");
      } else {
        // Transaction mode pooler (port 6543): needs pgbouncer=true
        if (!urlObj.searchParams.has("pgbouncer")) {
          urlObj.searchParams.set("pgbouncer", "true");
        }
      }

      if (!urlObj.searchParams.has("connection_limit")) {
        urlObj.searchParams.set("connection_limit", "5");
      }
      if (!urlObj.searchParams.has("pool_timeout")) {
        urlObj.searchParams.set("pool_timeout", "10");
      }

      url = urlObj.toString();
    } catch {
      url = connectionString;
    }
  }

  return new PrismaClient({
    datasourceUrl: url,
    log: ["error"],
  });
}

export const prisma = 
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (globalForPrisma.prisma ??= createPrismaClient());
