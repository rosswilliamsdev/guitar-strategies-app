import { prisma } from "@/lib/db";
import { addWeeks, addMonths, startOfDay, endOfDay } from "date-fns";
import { generateRecurringLessons } from "@/lib/recurring-lessons";

export interface JobResult {
  success: boolean;
  lessonsGenerated: number;
  teachersProcessed: number;
  errors: string[];
}

/**
 * Background job to automatically generate recurring lessons for the next 12 weeks
 * This ensures students can always book lessons well in advance
 */
export async function generateFutureLessons(): Promise<JobResult> {
  const result: JobResult = {
    success: false,
    lessonsGenerated: 0,
    teachersProcessed: 0,
    errors: [],
  };

  try {
    console.log("Starting automatic lesson generation job...");

    // Get all active teachers with recurring slots
    const teachers = await prisma.teacherProfile.findMany({
      where: {
        isActive: true,
        user: {
          role: "TEACHER",
        },
        recurringSlots: {
          some: {
            status: "ACTIVE",
          },
        },
      },
      include: {
        user: true,
        recurringSlots: {
          where: {
            status: "ACTIVE",
          },
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${teachers.length} teachers with active recurring slots`);

    // Generate lessons for the next 12 weeks from today
    const startDate = startOfDay(new Date());
    const endDate = endOfDay(addWeeks(startDate, 12));

    for (const teacher of teachers) {
      try {
        const lessonsCreated = await generateRecurringLessons(
          teacher.id,
          startDate,
          endDate
        );

        result.lessonsGenerated += lessonsCreated;
        result.teachersProcessed++;

        if (lessonsCreated > 0) {
          console.log(
            `Generated ${lessonsCreated} lessons for teacher ${teacher.user.name} (${teacher.user.email})`
          );
        }
      } catch (error) {
        const errorMessage = `Failed to generate lessons for teacher ${teacher.user.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        console.error(errorMessage);
        result.errors.push(errorMessage);
      }
    }

    result.success = result.errors.length === 0;

    console.log(
      `Lesson generation job completed. Generated ${result.lessonsGenerated} lessons for ${result.teachersProcessed} teachers. Errors: ${result.errors.length}`
    );

    // Log job execution to database for monitoring
    await logJobExecution(result);

    return result;
  } catch (error) {
    const errorMessage = `Fatal error in lesson generation job: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    result.errors.push(errorMessage);
    result.success = false;

    // Still try to log the failure
    try {
      await logJobExecution(result);
    } catch (logError) {
      console.error("Failed to log job execution:", logError);
    }

    return result;
  }
}

/**
 * Clean up old lesson generation logs (keep last 30 days)
 */
export async function cleanupJobLogs(): Promise<void> {
  try {
    const thirtyDaysAgo = addMonths(new Date(), -1);

    const deleted = await prisma.backgroundJobLog.deleteMany({
      where: {
        executedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`Cleaned up ${deleted.count} old job logs`);
  } catch (error) {
    console.error("Failed to clean up job logs:", error);
  }
}

/**
 * Log job execution for monitoring and debugging
 */
async function logJobExecution(result: JobResult): Promise<void> {
  try {
    await prisma.backgroundJobLog.create({
      data: {
        jobName: "generate-future-lessons",
        executedAt: new Date(),
        success: result.success,
        lessonsGenerated: result.lessonsGenerated,
        teachersProcessed: result.teachersProcessed,
        errors: result.errors.join("; "),
      },
    });
  } catch (error) {
    console.error("Failed to log job execution:", error);
    // Don't throw here - logging failure shouldn't break the main job
  }
}

/**
 * Get recent job execution history for admin monitoring
 */
export async function getJobHistory(limit: number = 10) {
  try {
    return await prisma.backgroundJobLog.findMany({
      orderBy: {
        executedAt: "desc",
      },
      take: limit,
    });
  } catch (error) {
    console.error("Failed to fetch job history:", error);
    return [];
  }
}

/**
 * Validate system health for lesson generation
 * Checks for teachers without proper settings, inactive recurring slots, etc.
 */
export async function validateSystemHealth(): Promise<{
  isHealthy: boolean;
  issues: string[];
  suggestions: string[];
}> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  try {
    // Check for teachers with recurring slots but no lesson settings
    const teachersWithoutSettings = await prisma.teacherProfile.findMany({
      where: {
        isActive: true,
        recurringSlots: {
          some: {
            status: "ACTIVE",
          },
        },
        lessonSettings: null,
      },
      include: {
        user: true,
      },
    });

    if (teachersWithoutSettings.length > 0) {
      issues.push(
        `${teachersWithoutSettings.length} teachers have recurring slots but no lesson settings configured`
      );
      suggestions.push(
        "Teachers should configure their lesson settings (pricing, durations) in the Settings page"
      );
    }

    // Check for recurring slots with students that no longer exist
    const orphanedSlots = await prisma.recurringSlot.findMany({
      where: {
        status: "ACTIVE",
        student: { is: null },
      },
    });

    if (orphanedSlots.length > 0) {
      issues.push(`${orphanedSlots.length} recurring slots have missing student references`);
      suggestions.push("Clean up recurring slots with invalid student references");
    }

    // Check for very old recurring slots that might need attention
    const oldSlots = await prisma.recurringSlot.findMany({
      where: {
        status: "ACTIVE",
        bookedAt: {
          lt: addMonths(new Date(), -6),
        },
      },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (oldSlots.length > 0) {
      issues.push(`${oldSlots.length} recurring slots are older than 6 months and may need review`);
      suggestions.push("Review long-running recurring slots to ensure they're still active");
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      suggestions,
    };
  } catch (error) {
    console.error("Failed to validate system health:", error);
    return {
      isHealthy: false,
      issues: ["Failed to perform system health check"],
      suggestions: ["Contact system administrator"],
    };
  }
}