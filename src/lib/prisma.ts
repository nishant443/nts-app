import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { env, isProduction } from "@/lib/env";

/**
 * Prisma 7 talks to Postgres through a driver adapter rather than a Rust
 * engine, so the connection pool lives in `pg` and is configured here.
 *
 * Next.js reloads modules on every edit in development; caching the client on
 * `globalThis` stops each reload from opening a fresh pool and exhausting the
 * database's connection limit.
 */
function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    // Serverless platforms recycle instances aggressively; a small pool per
    // instance avoids saturating the database.
    max: isProduction ? 10 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["warn", "error"],
  });
}

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientSingleton;
};

export const prisma: PrismaClientSingleton =
  globalForPrisma.prisma ?? createPrismaClient();

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

export { Prisma } from "@/generated/prisma/client";
