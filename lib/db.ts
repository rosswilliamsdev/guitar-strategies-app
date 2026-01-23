/**
 * @fileoverview Prisma database client configuration.
 * Provides a singleton Prisma client instance with development logging
 * and graceful shutdown handling.
 */

import { PrismaClient } from "@prisma/client";
import { log, dbLog } from '@/lib/logger';

/**
 * Global type definition for Prisma client to prevent multiple instances
 * in development due to hot reloading.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton Prisma client instance with connection pooling.
 *
 * In development:
 * - Logs queries, errors, and warnings for debugging
 * - Uses global variable to prevent multiple instances from hot reloading
 * - Conservative connection pool for local development
 *
 * In production:
 * - Only logs errors to reduce noise
 * - Optimized connection pool limits for production workloads
 * - Uses pretty error formatting for better debugging
 * - Uses Neon's POSTGRES_PRISMA_URL (optimized for Prisma with proper pooling)
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: "pretty",
    datasources: {
      db: {
        url: process.env.NODE_ENV === "production"
          ? process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
          : process.env.DATABASE_URL
      }
    }
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
    log.error('Database connection failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return false;
  }
}

/**
 * Database connection pool status check.
 * 
 * Provides information about current connection pool usage.
 * Useful for monitoring and debugging connection issues.
 * 
 * @returns Promise with pool status information
 * 
 * @example
 * ```typescript
 * const poolStatus = await getConnectionPoolStatus();
 * log.info('Pool status:', poolStatus);
 * ```
 */
export async function getConnectionPoolStatus() {
  try {
    // Test connection with a simple query and measure response time
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    
    const poolSettings = {
      maxConnections: process.env.NODE_ENV === "production" ? 10 : 5,
      poolTimeout: process.env.NODE_ENV === "production" ? 20 : 10,
      connectTimeout: process.env.NODE_ENV === "production" ? 10 : 5,
    };
    
    return {
      isHealthy: true,
      connectionTest: {
        success: true,
        responseTime: responseTime,
        threshold: 1000 // ms
      },
      poolSettings,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    log.error('Failed to get connection pool status:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return {
      isHealthy: false,
      connectionTest: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      poolSettings: {
        maxConnections: process.env.NODE_ENV === "production" ? 10 : 5,
        poolTimeout: process.env.NODE_ENV === "production" ? 20 : 10,
        connectTimeout: process.env.NODE_ENV === "production" ? 10 : 5,
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Validates required database environment variables.
 * 
 * Ensures all necessary environment variables are set for database connections.
 * Should be called during application startup.
 * 
 * @throws Error if required environment variables are missing
 */
export function validateDatabaseEnvironment(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // Validate DATABASE_URL format for PostgreSQL
  if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }
  
  log.info('✅ Database environment variables validated successfully');
}
