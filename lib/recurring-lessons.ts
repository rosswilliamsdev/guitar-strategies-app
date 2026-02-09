import { prisma } from "@/lib/db";
import { addWeeks } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * Generates lessons from active recurring slots for a given date range
 * This ensures that recurring lessons appear on the schedule even if they haven't been created yet
 */
export async function generateRecurringLessons(
  teacherId: string,
  startDate: Date,
  endDate: Date,
) {
  // Get teacher's timezone
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { timezone: true },
  });

  const teacherTimezone = teacher?.timezone || "America/Chicago";

  // Get all active recurring slots for this teacher
  const recurringSlots = await prisma.recurringSlot.findMany({
    where: {
      teacherId,
      status: "ACTIVE",
    },
    include: {
      student: {
        include: {
          user: true,
        },
      },
    },
  });

  const lessonsToCreate = [];

  for (const slot of recurringSlots) {
    // Find the first occurrence of this day of week within our date range
    let currentDate = new Date(startDate);

    // Move to the first occurrence of the slot's day of week
    while (currentDate.getDay() !== slot.dayOfWeek && currentDate <= endDate) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate lessons for each week within the date range
    while (currentDate <= endDate) {
      // Parse the slot's start time (stored in teacher's timezone)
      const [hours, minutes] = slot.startTime.split(":").map(Number);

      // Create date in teacher's timezone
      const lessonDateInTeacherTZ = new Date(currentDate);
      lessonDateInTeacherTZ.setHours(hours, minutes, 0, 0);

      // Convert to UTC for database storage (matches booking API behavior)
      const lessonDateUTC = fromZonedTime(
        lessonDateInTeacherTZ,
        teacherTimezone,
      );

      // Check if a lesson already exists for this date and time
      const existingLesson = await prisma.lesson.findFirst({
        where: {
          teacherId,
          studentId: slot.studentId,
          date: lessonDateUTC,
        },
      });

      // Only create if lesson doesn't exist
      if (!existingLesson) {
        lessonsToCreate.push({
          teacherId,
          studentId: slot.studentId,
          date: lessonDateUTC,
          duration: slot.duration,
          status: "SCHEDULED" as const,
          isRecurring: true,
          recurringSlotId: slot.id,
        });
      }

      // Move to next week
      currentDate = addWeeks(currentDate, 1);
    }
  }

  // Create all the missing lessons
  if (lessonsToCreate.length > 0) {
    await prisma.lesson.createMany({
      data: lessonsToCreate,
      skipDuplicates: true, // Extra safety
    });
  }

  return lessonsToCreate.length;
}

/**
 * Gets all lessons for a teacher including auto-generated recurring lessons
 */
export async function getLessonsWithRecurring(
  teacherId: string,
  startDate: Date,
  endDate: Date,
) {
  // First, generate any missing recurring lessons
  await generateRecurringLessons(teacherId, startDate, endDate);

  // Then fetch all lessons for the date range (excluding cancelled lessons)
  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["SCHEDULED", "COMPLETED"],
      },
    },
    include: {
      student: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  return lessons;
}
