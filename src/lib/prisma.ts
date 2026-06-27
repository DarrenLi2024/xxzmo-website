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
      const [base, qs = ""] = connectionString.split("?");
      const params = new URLSearchParams(qs);
      
      // Session mode pooler (port 5432): no pgbouncer flag needed
      if (connectionString.includes(":5432")) {
        params.delete("pgbouncer");
      } else {
        // Transaction mode pooler (port 6543): needs pgbouncer=true
        if (!params.has("pgbouncer")) params.set("pgbouncer", "true");
      }
      
      if (!params.has("connection_limit")) params.set("connection_limit", "1");
      if (!params.has("pool_timeout")) params.set("pool_timeout", "20");
      
      const newQs = params.toString();
      url = newQs ? `${base}?${newQs}` : base;
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
