/**
 * @fileoverview Utility functions for cleaning up lesson data.
 * 
 * Handles automatic status updates for past lessons and maintains
 * data consistency across the application.
 */

import { prisma } from '@/lib/db';

/**
 * Updates past scheduled lessons to appropriate status.
 * 
 * This function should be called periodically or before displaying
 * upcoming lessons to ensure data consistency.
 * 
 * @returns Promise with cleanup results
 */
export async function cleanupPastLessons(): Promise<{
  updatedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updatedCount = 0;

  try {
    const now = new Date();
    
    // Update past scheduled lessons to MISSED status
    const result = await prisma.lesson.updateMany({
      where: {
        date: { lt: now },
        status: 'SCHEDULED'
      },
      data: {
        status: 'MISSED',
        notes: 'Automatically marked as missed - lesson time passed'
      }
    });

    updatedCount = result.count;

    console.log(`Cleaned up ${updatedCount} past lessons`);
    
    return {
      updatedCount,
      errors
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to cleanup lessons: ${errorMessage}`);
    console.error('Error cleaning up past lessons:', error);
    
    return {
      updatedCount,
      errors
    };
  }
}

/**
 * Gets upcoming lessons for a student with automatic cleanup.
 * 
 * @param studentId - Student profile ID
 * @param limit - Maximum number of lessons to return
 * @returns Promise with upcoming lessons
 */
export async function getUpcomingLessonsWithCleanup(
  studentId: string,
  limit: number = 5
) {
  // Clean up past lessons first
  await cleanupPastLessons();

  const now = new Date();
  
  // Get truly upcoming lessons
  const upcomingLessons = await prisma.lesson.findMany({
    where: {
      studentId,
      date: { gte: now },
      status: 'SCHEDULED'
    },
    orderBy: { date: 'asc' },
    take: limit,
    include: {
      teacher: {
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  return upcomingLessons;
}

/**
 * Checks if a lesson can be cancelled based on its date and status.
 * 
 * @param lessonDate - The lesson date
 * @param lessonStatus - Current lesson status
 * @param bufferHours - Hours before lesson when cancellation is not allowed
 * @returns boolean indicating if lesson can be cancelled
 */
export function canCancelLesson(
  lessonDate: Date,
  lessonStatus: string,
  bufferHours: number = 2
): { canCancel: boolean; reason?: string } {
  const now = new Date();
  const lessonTime = new Date(lessonDate);
  const bufferTime = new Date(now.getTime() + bufferHours * 60 * 60 * 1000);

  if (lessonStatus !== 'SCHEDULED') {
    return {
      canCancel: false,
      reason: `Cannot cancel lesson with status: ${lessonStatus}`
    };
  }

  if (lessonTime <= now) {
    return {
      canCancel: false,
      reason: 'Cannot cancel lessons that have already started or passed'
    };
  }

  if (lessonTime <= bufferTime) {
    return {
      canCancel: false,
      reason: `Cannot cancel lessons within ${bufferHours} hours of start time`
    };
  }

  return { canCancel: true };
}