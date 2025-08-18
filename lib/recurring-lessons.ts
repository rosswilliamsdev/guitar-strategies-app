import { prisma } from "@/lib/db";
import { addWeeks } from "date-fns";

/**
 * Generates lessons from active recurring slots for a given date range
 * This ensures that recurring lessons appear on the schedule even if they haven't been created yet
 */
export async function generateRecurringLessons(
  teacherId: string,
  startDate: Date,
  endDate: Date
) {
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
      // Parse the slot's start time
      const [hours, minutes] = slot.startTime.split(":").map(Number);
      const lessonDate = new Date(currentDate);
      lessonDate.setHours(hours, minutes, 0, 0);

      // Check if a lesson already exists for this date and time
      const existingLesson = await prisma.lesson.findFirst({
        where: {
          teacherId,
          studentId: slot.studentId,
          date: lessonDate,
        },
      });

      // Only create if lesson doesn't exist
      if (!existingLesson) {
        lessonsToCreate.push({
          teacherId,
          studentId: slot.studentId,
          date: lessonDate,
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
  endDate: Date
) {
  // First, generate any missing recurring lessons
  await generateRecurringLessons(teacherId, startDate, endDate);

  // Then fetch all lessons for the date range
  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["SCHEDULED", "COMPLETED", "CANCELLED"],
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