import { prisma } from "@/lib/db";
import { addWeeks, addMonths, startOfDay, endOfDay } from "date-fns";
import { generateRecurringLessons } from "@/lib/recurring-lessons";
import { generateMonthlyRecurringInvoices } from "@/lib/invoice-automation";

export interface JobResult {
  success: boolean;
  lessonsGenerated: number;
  teachersProcessed: number;
  errors: string[];
}

export interface InvoiceJobResult {
  success: boolean;
  invoicesCreated: number;
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
 * Background job to generate monthly invoices for recurring lessons
 * This should run on the 1st of each month
 */
export async function generateMonthlyInvoices(): Promise<InvoiceJobResult> {
  const result: InvoiceJobResult = {
    success: false,
    invoicesCreated: 0,
    errors: [],
  };

  try {
    console.log("Starting monthly invoice generation job...");

    // Generate invoices for the current month
    const invoiceResult = await generateMonthlyRecurringInvoices();
    
    result.invoicesCreated = invoiceResult.invoicesCreated;
    result.errors = invoiceResult.errors;
    result.success = invoiceResult.errors.length === 0;

    console.log(
      `Monthly invoice generation job completed. Generated ${result.invoicesCreated} invoices. Errors: ${result.errors.length}`
    );

    // Log job execution to database for monitoring
    await logInvoiceJobExecution(result);

    return result;
  } catch (error) {
    const errorMessage = `Fatal error in monthly invoice generation job: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(errorMessage);
    result.errors.push(errorMessage);
    result.success = false;

    // Still try to log the failure
    try {
      await logInvoiceJobExecution(result);
    } catch (logError) {
      console.error("Failed to log invoice job execution:", logError);
    }

    return result;
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
 * Log invoice job execution for monitoring and debugging
 */
async function logInvoiceJobExecution(result: InvoiceJobResult): Promise<void> {
  try {
    await prisma.backgroundJobLog.create({
      data: {
        jobName: "generate-monthly-invoices",
        executedAt: new Date(),
        success: result.success,
        lessonsGenerated: result.invoicesCreated, // Reuse this field for invoice count
        teachersProcessed: 0, // Not applicable for invoice job
        errors: result.errors.join("; "),
      },
    });
  } catch (error) {
    console.error("Failed to log invoice job execution:", error);
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
  indicators: {
    totalUsers: number;
    activeTeachers: number;
    activeStudents: number;
    activeRecurringSlots: number;
    teachersWithSettings: number;
    teachersWithoutSettings: number;
    oldSlotsCount: number;
    recentLessons: number;
    pendingInvoices: number;
  };
}> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  try {
    // Gather system health indicators
    const [
      totalUsers,
      activeTeachers,
      activeStudents, 
      activeRecurringSlots,
      teachersWithoutSettings,
      oldSlots,
      recentLessons,
      pendingInvoices
    ] = await Promise.all([
      // Total users count
      prisma.user.count(),
      
      // Active teachers
      prisma.teacherProfile.count({
        where: { isActive: true }
      }),
      
      // Active students
      prisma.studentProfile.count({
        where: { isActive: true }
      }),
      
      // Active recurring slots
      prisma.recurringSlot.count({
        where: { status: "ACTIVE" }
      }),
      
      // Teachers with recurring slots but no lesson settings
      prisma.teacherProfile.findMany({
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
      }),
      
      // Very old recurring slots (6+ months)
      prisma.recurringSlot.findMany({
        where: {
          status: "ACTIVE",
          bookedAt: {
            lt: addMonths(new Date(), -6),
          },
        },
      }),
      
      // Lessons in the last 30 days
      prisma.lesson.count({
        where: {
          createdAt: {
            gte: addMonths(new Date(), -1),
          },
        },
      }),
      
      // Pending invoices
      prisma.invoice.count({
        where: {
          status: "PENDING",
        },
      }),
    ]);

    // Calculate teachers with settings
    const teachersWithSettings = activeTeachers - teachersWithoutSettings.length;

    // Create indicators object
    const indicators = {
      totalUsers,
      activeTeachers,
      activeStudents,
      activeRecurringSlots,
      teachersWithSettings,
      teachersWithoutSettings: teachersWithoutSettings.length,
      oldSlotsCount: oldSlots.length,
      recentLessons,
      pendingInvoices,
    };

    // Check for issues based on indicators
    if (teachersWithoutSettings.length > 0) {
      issues.push(
        `${teachersWithoutSettings.length} teachers have recurring slots but no lesson settings configured`
      );
      suggestions.push(
        "Teachers should configure their lesson settings (pricing, durations) in the Settings page"
      );
    }

    if (oldSlots.length > 0) {
      issues.push(`${oldSlots.length} recurring slots are older than 6 months and may need review`);
      suggestions.push("Review long-running recurring slots to ensure they're still active");
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      suggestions,
      indicators,
    };
  } catch (error) {
    console.error("Failed to validate system health:", error);
    return {
      isHealthy: false,
      issues: ["Failed to perform system health check"],
      suggestions: ["Contact system administrator"],
      indicators: {
        totalUsers: 0,
        activeTeachers: 0,
        activeStudents: 0,
        activeRecurringSlots: 0,
        teachersWithSettings: 0,
        teachersWithoutSettings: 0,
        oldSlotsCount: 0,
        recentLessons: 0,
        pendingInvoices: 0,
      },
    };
  }
}