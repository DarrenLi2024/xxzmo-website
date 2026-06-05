import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Optimize for serverless (Vercel) with Neon PostgreSQL
  const connectionString = process.env.DATABASE_URL || "file:./dev.db";

  // Add connection_limit=1 for serverless to prevent connection exhaustion
  let adjustedUrl = connectionString;
  if (connectionString.startsWith("postgresql://") && !connectionString.includes("connection_limit")) {
    const separator = connectionString.includes("?") ? "&" : "?";
    adjustedUrl = `${connectionString}${separator}connection_limit=1&pool_timeout=10`;
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

// In development, cache the client on global
// In production serverless, we want fresh connections per instance
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
