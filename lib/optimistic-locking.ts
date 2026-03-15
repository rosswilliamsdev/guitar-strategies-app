/**
 * Optimistic Locking Utilities
 * 
 * Provides utilities for handling concurrent updates with version-based optimistic locking.
 * Prevents race conditions in booking operations and other critical updates.
 */

import { prisma } from '@/lib/db';
import { Prisma, Lesson, TeacherAvailability, RecurringSlot } from '@prisma/client';

export class OptimisticLockingError extends Error {
  constructor(message: string, public currentVersion?: number, public attemptedVersion?: number) {
    super(message);
    this.name = 'OptimisticLockingError';
  }
}

// Type for Prisma model delegate with basic CRUD operations
interface PrismaModelDelegate<T> {
  update(args: { where: { id: string; version: number }; data: Record<string, unknown> }): Promise<T>;
  findUnique(args: { where: { id: string } }): Promise<{ version: number } | null>;
}

/**
 * Generic optimistic update function
 * Updates a record only if the version matches, incrementing version on success
 */
export async function optimisticUpdate<T extends { version: number }>(
  model: PrismaModelDelegate<T>,
  id: string,
  expectedVersion: number,
  updateData: Partial<T>
): Promise<T> {
  try {
    // Remove version from updateData to avoid conflicts
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { version, ...dataWithoutVersion } = updateData as Record<string, unknown> & { version?: number };

    const updated = await model.update({
      where: {
        id,
        version: expectedVersion, // Only update if version matches
      },
      data: {
        ...dataWithoutVersion,
        version: expectedVersion + 1, // Increment version
      },
    });

    return updated;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Record not found
        // Check if record exists with different version
        const current = await model.findUnique({ where: { id } });
        if (current) {
          throw new OptimisticLockingError(
            `Concurrent modification detected. Expected version ${expectedVersion}, but current version is ${current.version}.`,
            current.version,
            expectedVersion
          );
        }
        throw new OptimisticLockingError(`Record with id ${id} not found.`);
      }
    }
    throw error;
  }
}

/**
 * Lesson-specific optimistic update
 */
export async function updateLessonOptimistic(
  id: string,
  expectedVersion: number,
  updateData: Partial<Lesson> | Prisma.LessonUncheckedUpdateInput
) {
  return optimisticUpdate(
    prisma.lesson as unknown as PrismaModelDelegate<Lesson>,
    id,
    expectedVersion,
    updateData as Partial<Lesson>
  );
}

/**
 * TeacherAvailability-specific optimistic update
 */
export async function updateTeacherAvailabilityOptimistic(
  id: string,
  expectedVersion: number,
  updateData: Partial<TeacherAvailability>
) {
  return optimisticUpdate(
    prisma.teacherAvailability as unknown as PrismaModelDelegate<TeacherAvailability>,
    id,
    expectedVersion,
    updateData
  );
}

/**
 * RecurringSlot-specific optimistic update
 */
export async function updateRecurringSlotOptimistic(
  id: string,
  expectedVersion: number,
  updateData: Partial<RecurringSlot>
) {
  return optimisticUpdate(
    prisma.recurringSlot as unknown as PrismaModelDelegate<RecurringSlot>,
    id,
    expectedVersion,
    updateData
  );
}

/**
 * Retry logic for optimistic locking conflicts
 * Attempts the operation multiple times with fresh data
 */
export async function retryOptimisticUpdate<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof OptimisticLockingError && attempt < maxRetries - 1) {
        // Wait with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Transaction-safe booking operation with optimistic locking
 * Ensures atomic booking updates with version checking
 */
export async function atomicBookingUpdate(operations: Array<() => Promise<unknown>>) {
  return await prisma.$transaction(async () => {
    const results: unknown[] = [];
    for (const operation of operations) {
      results.push(await operation());
    }
    return results;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5000, // 5 seconds
    timeout: 10000, // 10 seconds
  });
}