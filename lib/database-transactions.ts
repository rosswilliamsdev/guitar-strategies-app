/**
 * @fileoverview Database transaction utilities for preventing race conditions and data corruption.
 * 
 * This library provides standardized transaction patterns for common operations
 * in the Guitar Strategies application, ensuring atomicity and consistency.
 */

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { log, dbLog, invoiceLog, schedulerLog } from '@/lib/logger';

/**
 * Transaction timeout in milliseconds
 * Adjust based on complexity of operations
 */
const DEFAULT_TRANSACTION_TIMEOUT = 10000; // 10 seconds

/**
 * Generic transaction wrapper with error handling and logging
 */
export async function executeTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  options: {
    timeout?: number;
    description?: string;
    retries?: number;
  } = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TRANSACTION_TIMEOUT,
    description = 'Database transaction',
    retries = 0
  } = options;

  let attempt = 0;
  const maxAttempts = retries + 1;

  while (attempt < maxAttempts) {
    try {
      log.info('🔄 Starting ${description} (attempt ${attempt + 1}/${maxAttempts})');
      
      const result = await prisma.$transaction(operation, {
        timeout,
        isolationLevel: 'ReadCommitted' // Prevents most race conditions
      });
      
      log.info('✅ Completed ${description} successfully');
      return result;
      
    } catch (error) {
      attempt++;
      log.error('❌ ${description} failed (attempt ${attempt}/${maxAttempts}):', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Check if this is a retryable error
      if (attempt < maxAttempts && isRetryableError(error)) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        log.info('⏳ Retrying in ${delay}ms...');
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Re-throw the error if no more retries or non-retryable error
      throw error;
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error(`Transaction failed after ${maxAttempts} attempts`);
}

/**
 * Check if an error is retryable (typically deadlocks or timeout errors)
 */
function isRetryableError(error: any): boolean {
  if (!error?.message) return false;
  
  const retryableMessages = [
    'deadlock',
    'timeout',
    'connection',
    'lock wait timeout',
    'serialization failure'
  ];
  
  const errorMessage = error.message.toLowerCase();
  return retryableMessages.some(msg => errorMessage.includes(msg));
}

/**
 * Booking transaction - handles lesson and recurring slot creation atomically
 */
export async function executeBookingTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  description: string = 'Lesson booking'
): Promise<T> {
  return executeTransaction(operation, {
    timeout: 15000, // Longer timeout for complex booking operations
    description,
    retries: 2 // Retry on conflicts
  });
}

/**
 * Cancellation transaction - handles lesson cancellation and cleanup
 */
export async function executeCancellationTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  description: string = 'Lesson cancellation'
): Promise<T> {
  return executeTransaction(operation, {
    timeout: 10000,
    description,
    retries: 1 // Single retry for cancellations
  });
}

/**
 * Bulk operation transaction - for operations affecting many records
 */
export async function executeBulkTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  description: string = 'Bulk operation'
): Promise<T> {
  return executeTransaction(operation, {
    timeout: 30000, // Longer timeout for bulk operations
    description,
    retries: 0 // No retries for bulk operations to avoid duplicates
  });
}

/**
 * Invoice transaction - handles invoice creation and related operations
 */
export async function executeInvoiceTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  description: string = 'Invoice operation'
): Promise<T> {
  return executeTransaction(operation, {
    timeout: 12000,
    description,
    retries: 1
  });
}

/**
 * Common transaction patterns
 */

/**
 * Safe lesson booking with conflict checking
 */
export async function safeBookLesson(data: {
  teacherId: string;
  studentId: string;
  date: Date;
  duration: number;
  timezone?: string;
  isRecurring?: boolean;
  price?: number;
}) {
  return executeBookingTransaction(async (tx) => {
    // Check for existing conflicts within the transaction
    const conflictingLesson = await tx.lesson.findFirst({
      where: {
        teacherId: data.teacherId,
        date: data.date,
        status: {
          not: 'CANCELLED'
        }
      }
    });

    if (conflictingLesson) {
      throw new Error('Time slot conflict: Another lesson is already scheduled');
    }

    // Create the lesson
    const lesson = await tx.lesson.create({
      data: {
        teacherId: data.teacherId,
        studentId: data.studentId,
        date: data.date,
        duration: data.duration,
        timezone: data.timezone,
        price: data.price,
        status: 'SCHEDULED',
        isRecurring: data.isRecurring || false
      }
    });

    return lesson;
  }, 'Safe lesson booking');
}

/**
 * Safe recurring slot creation
 */
export async function safeCreateRecurringSlot(data: {
  teacherId: string;
  studentId: string;
  dayOfWeek: number;
  startTime: string;
  duration: number;
  perLessonPrice: number;
}) {
  return executeBookingTransaction(async (tx) => {
    // Check for existing recurring slot conflicts
    const existingSlot = await tx.recurringSlot.findFirst({
      where: {
        teacherId: data.teacherId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        status: 'ACTIVE'
      }
    });

    if (existingSlot) {
      throw new Error('Recurring slot conflict: Teacher already has a recurring lesson at this time');
    }

    // Create the recurring slot
    const slot = await tx.recurringSlot.create({
      data: {
        teacherId: data.teacherId,
        studentId: data.studentId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        duration: data.duration,
        perLessonPrice: data.perLessonPrice,
        status: 'ACTIVE'
      }
    });

    return slot;
  }, 'Safe recurring slot creation');
}

/**
 * Safe lesson cancellation with cleanup
 */
export async function safeCancelLesson(lessonId: string, options: {
  cancelReason?: string;
  notifyUsers?: boolean;
}) {
  return executeCancellationTransaction(async (tx) => {
    // Get current lesson state
    const lesson = await tx.lesson.findUnique({
      where: { id: lessonId },
      include: {
        teacher: { include: { user: true } },
        student: { include: { user: true } }
      }
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    if (lesson.status === 'CANCELLED') {
      throw new Error('Lesson is already cancelled');
    }

    // Update lesson status
    const cancelledLesson = await tx.lesson.update({
      where: { id: lessonId },
      data: {
        status: 'CANCELLED',
        notes: options.cancelReason ? 
          `${lesson.notes || ''}\nCancelled: ${options.cancelReason}`.trim() :
          `${lesson.notes || ''}\nCancelled`.trim()
      }
    });

    return { lesson: cancelledLesson, originalLesson: lesson };
  }, 'Safe lesson cancellation');
}

/**
 * Batch operation with progress tracking
 */
export async function executeBatchOperation<TInput, TOutput>(
  items: TInput[],
  operation: (item: TInput, tx: Prisma.TransactionClient) => Promise<TOutput>,
  options: {
    batchSize?: number;
    description?: string;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<TOutput[]> {
  const {
    batchSize = 10,
    description = 'Batch operation',
    onProgress
  } = options;

  const results: TOutput[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchResults = await executeTransaction(async (tx) => {
      const batchPromises = batch.map(item => operation(item, tx));
      return Promise.all(batchPromises);
    }, {
      description: `${description} (batch ${Math.floor(i / batchSize) + 1})`,
      timeout: 20000 // Longer timeout for batches
    });
    
    results.push(...batchResults);
    
    if (onProgress) {
      onProgress(results.length, items.length);
    }
  }
  
  return results;
}

/**
 * Database health check within transaction
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await executeTransaction(async (tx) => {
      // Simple queries to test database responsiveness
      await tx.$queryRaw`SELECT 1`;
      
      // Test a basic table query
      await tx.user.findFirst({
        select: { id: true }
      });
      
      return true;
    }, {
      description: 'Database health check',
      timeout: 5000
    });
    
    return {
      healthy: true,
      responseTime: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Transaction isolation level helpers
 */
export const IsolationLevels = {
  /**
   * Read Committed - Prevents dirty reads, allows non-repeatable reads
   * Good for most operations where fresh data is more important than consistency
   */
  READ_COMMITTED: 'ReadCommitted' as const,
  
  /**
   * Repeatable Read - Prevents dirty reads and non-repeatable reads
   * Good for operations that need consistent reads throughout the transaction
   */
  REPEATABLE_READ: 'RepeatableRead' as const,
  
  /**
   * Serializable - Highest isolation, prevents all phenomena
   * Use only when necessary due to performance impact
   */
  SERIALIZABLE: 'Serializable' as const,
  
  /**
   * Read Uncommitted - Lowest isolation, allows dirty reads
   * Generally not recommended for production use
   */
  READ_UNCOMMITTED: 'ReadUncommitted' as const
} as const;

export type TransactionIsolationLevel = typeof IsolationLevels[keyof typeof IsolationLevels];