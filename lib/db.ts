/**
 * @fileoverview Prisma database client configuration.
 * Provides a singleton Prisma client instance with development logging
 * and graceful shutdown handling.
 */

import { PrismaClient } from "@prisma/client";

/**
 * Global type definition for Prisma client to prevent multiple instances
 * in development due to hot reloading.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton Prisma client instance.
 * 
 * In development:
 * - Logs queries, errors, and warnings for debugging
 * - Uses global variable to prevent multiple instances from hot reloading
 * 
 * In production:
 * - Only logs errors to reduce noise
 * - Uses pretty error formatting for better debugging
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: "pretty",
  });

// Store Prisma client globally in development to prevent multiple instances
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown handler.
 * Ensures database connections are properly closed when the process exits.
 */
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

/**
 * Database health check utility.
 * 
 * Performs a simple query to verify database connectivity.
 * Useful for health checks and startup validation.
 * 
 * @returns Promise that resolves to true if database is accessible, false otherwise
 * 
 * @example
 * ```typescript
 * const isHealthy = await checkDatabaseConnection();
 * if (!isHealthy) {
 *   console.error('Database is not accessible');
 * }
 * ```
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
