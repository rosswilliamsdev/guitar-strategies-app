/**
 * Database client with automatic retry logic for transient failures
 */

import { PrismaClient } from '@prisma/client';
import { withRetry, databaseRetryOptions, criticalRetryOptions } from './retry';
import { log, dbLog, invoiceLog, schedulerLog } from '@/lib/logger';

// Import the existing database client configuration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Get pool configuration based on environment
const getPoolConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    connection_limit: isDevelopment ? 5 : 10,
    pool_timeout: isDevelopment ? 10 : 20,
    connect_timeout: isDevelopment ? 5 : 10,
  };
};

// Create Prisma client with pool configuration
const createPrismaClient = () => {
  const poolConfig = getPoolConfig();
  const baseUrl = process.env.DATABASE_URL || '';
  
  // Add pool configuration to connection string if not already present
  let connectionUrl = baseUrl;
  if (!baseUrl.includes('connection_limit')) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    connectionUrl = `${baseUrl}${separator}connection_limit=${poolConfig.connection_limit}&pool_timeout=${poolConfig.pool_timeout}&connect_timeout=${poolConfig.connect_timeout}`;
  }
  
  return new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Wrapper for database queries with automatic retry logic
 */
export async function dbQuery<T>(
  queryFn: () => Promise<T>,
  options = databaseRetryOptions
): Promise<T> {
  return withRetry(queryFn, options);
}

/**
 * Wrapper for critical database operations (transactions, financial data)
 */
export async function criticalDbQuery<T>(
  queryFn: () => Promise<T>
): Promise<T> {
  return withRetry(queryFn, criticalRetryOptions);
}

/**
 * Extended Prisma client with retry methods
 */
export const prismaWithRetry = {
  ...prisma,
  
  /**
   * Find operations with retry
   */
  findWithRetry: {
    user: async (args: any) => dbQuery(() => prisma.user.findUnique(args)),
    lesson: async (args: any) => dbQuery(() => prisma.lesson.findUnique(args)),
    invoice: async (args: any) => dbQuery(() => prisma.invoice.findUnique(args)),
    teacherProfile: async (args: any) => dbQuery(() => prisma.teacherProfile.findUnique(args)),
    studentProfile: async (args: any) => dbQuery(() => prisma.studentProfile.findUnique(args)),
  },
  
  /**
   * Create operations with retry
   */
  createWithRetry: {
    user: async (args: any) => criticalDbQuery(() => prisma.user.create(args)),
    lesson: async (args: any) => dbQuery(() => prisma.lesson.create(args)),
    invoice: async (args: any) => criticalDbQuery(() => prisma.invoice.create(args)),
    recurringSlot: async (args: any) => dbQuery(() => prisma.recurringSlot.create(args)),
  },
  
  /**
   * Update operations with retry
   */
  updateWithRetry: {
    user: async (args: any) => criticalDbQuery(() => prisma.user.update(args)),
    lesson: async (args: any) => dbQuery(() => prisma.lesson.update(args)),
    invoice: async (args: any) => criticalDbQuery(() => prisma.invoice.update(args)),
    teacherProfile: async (args: any) => dbQuery(() => prisma.teacherProfile.update(args)),
    studentProfile: async (args: any) => dbQuery(() => prisma.studentProfile.update(args)),
  },
  
  /**
   * Delete operations with retry
   */
  deleteWithRetry: {
    lesson: async (args: any) => dbQuery(() => prisma.lesson.delete(args)),
    recurringSlot: async (args: any) => dbQuery(() => prisma.recurringSlot.delete(args)),
    invoice: async (args: any) => criticalDbQuery(() => prisma.invoice.delete(args)),
  },
  
  /**
   * Transaction with retry
   */
  transactionWithRetry: async <T>(
    fn: (tx: any) => Promise<T>
  ): Promise<T> => {
    return criticalDbQuery(() => prisma.$transaction(fn)) as Promise<T>;
  },
  
  /**
   * Batch operations with retry
   */
  createManyWithRetry: {
    lessons: async (args: any) => dbQuery(() => prisma.lesson.createMany(args)),
    invoiceItems: async (args: any) => criticalDbQuery(() => prisma.invoiceItem.createMany(args)),
  },
};

/**
 * Helper to check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Prisma-specific retryable errors
  const retryableCodes = ['P2024', 'P2025', 'P2034', 'P2023'];
  if (error?.code && retryableCodes.includes(error.code)) {
    return true;
  }
  
  // Network and connection errors
  if (error?.code === 'ETIMEDOUT' || 
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ECONNRESET') {
    return true;
  }
  
  // Check error message for connection issues
  if (error?.message?.toLowerCase().includes('connection') ||
      error?.message?.toLowerCase().includes('timeout')) {
    return true;
  }
  
  return false;
}

/**
 * Log database errors with context
 */
export function logDatabaseError(
  operation: string,
  error: any,
  context?: Record<string, any>
): void {
  const errorInfo = {
    operation,
    error: {
      code: error?.code,
      message: error?.message,
      meta: error?.meta,
    },
    context,
    timestamp: new Date().toISOString(),
    isRetryable: isRetryableError(error),
  };
  
  if (process.env.NODE_ENV === 'production') {
    // In production, log to monitoring service
    log.error('[Database Error]', {
        errorInfo: JSON.stringify(errorInfo)
      });
  } else {
    // In development, log more verbosely
    log.error('[Database Error]', {
        error: errorInfo instanceof Error ? errorInfo.message : String(errorInfo),
        stack: errorInfo instanceof Error ? errorInfo.stack : undefined
      });
  }
}