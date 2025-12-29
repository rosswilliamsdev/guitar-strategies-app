import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { toZonedTime } from "date-fns-tz";
import {
  createSuccessResponse,
  createAuthErrorResponse,
  createNotFoundResponse,
  createBadRequestResponse,
  createConflictResponse,
  createValidationErrorResponse,
  handleApiError
} from "@/lib/api-responses";

const bookForStudentSchema = z.object({
  teacherId: z.string(),
  studentId: z.string(),
  date: z.string().datetime(),
  duration: z.number().min(30).max(120),
  type: z.enum(["single", "recurring"]),
  indefinite: z.boolean().optional(), // For truly indefinite recurring lessons
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "TEACHER") {
      return createAuthErrorResponse("Teacher access required");
    }

    const body = await request.json();
    const validatedData = bookForStudentSchema.parse(body);

    // Verify the teacher owns this student
    const student = await prisma.studentProfile.findFirst({
      where: {
        id: validatedData.studentId,
        teacherId: validatedData.teacherId,
      },
    });

    if (!student) {
      return createNotFoundResponse("Student or student assignment");
    }

    // Get teacher's timezone
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: validatedData.teacherId },
      select: { timezone: true },
    });

    const teacherTimezone = teacher?.timezone || "America/New_York";

    // Convert UTC date to teacher's timezone for availability checking
    const lessonDateUTC = new Date(validatedData.date);
    const lessonDateInTeacherTZ = toZonedTime(lessonDateUTC, teacherTimezone);
    const dayOfWeek = lessonDateInTeacherTZ.getDay();
    const hours = lessonDateInTeacherTZ.getHours();
    const minutes = lessonDateInTeacherTZ.getMinutes();
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

    const availability = await prisma.teacherAvailability.findFirst({
      where: {
        teacherId: validatedData.teacherId,
        dayOfWeek,
        startTime: { lte: timeString },
        endTime: { gt: timeString },
        isActive: true,
      },
    });

    if (!availability) {
      return createBadRequestResponse("This time slot is not within your availability");
    }

    // Check for conflicts (use UTC date for DB comparison)
    const endTime = new Date(lessonDateUTC);
    endTime.setMinutes(endTime.getMinutes() + validatedData.duration);

    const conflict = await prisma.lesson.findFirst({
      where: {
        teacherId: validatedData.teacherId,
        date: {
          gte: lessonDateUTC,
          lt: endTime,
        },
        status: {
          in: ["SCHEDULED"],
        },
      },
    });

    if (conflict) {
      return createConflictResponse("This time slot already has a lesson scheduled");
    }

    // Use transaction to ensure atomicity for both single and recurring bookings
    const result = await prisma.$transaction(async (tx) => {
      // Double-check for conflicts within the transaction to prevent race conditions
      const conflict = await tx.lesson.findFirst({
        where: {
          teacherId: validatedData.teacherId,
          date: {
            gte: lessonDateUTC,
            lt: endTime,
          },
          status: {
            in: ["SCHEDULED"],
          },
        },
      });

      if (conflict) {
        throw new Error("This time slot was just booked by another lesson");
      }

      // Get teacher's lesson settings for pricing
      const teacher = await tx.teacherProfile.findUnique({
        where: { id: validatedData.teacherId },
        include: { lessonSettings: true }
      });

      if (!teacher?.lessonSettings) {
        throw new Error("Teacher lesson settings not found");
      }

      // Calculate the price based on duration
      const lessonPrice = validatedData.duration === 30
        ? teacher.lessonSettings.price30Min
        : teacher.lessonSettings.price60Min;

      if (validatedData.type === "single") {
        // Create single lesson (store in UTC)
        const lesson = await tx.lesson.create({
          data: {
            teacherId: validatedData.teacherId,
            studentId: validatedData.studentId,
            date: lessonDateUTC,
            duration: validatedData.duration,
            status: "SCHEDULED",
          },
        });

        return { type: "single", lesson };
      } else {
        // Create indefinite recurring slot (already converted to teacher's timezone above)
        // Reuse the timezone-converted values from earlier

        // Check for existing recurring slot conflicts within transaction
        const existingSlot = await tx.recurringSlot.findFirst({
          where: {
            teacherId: validatedData.teacherId,
            dayOfWeek,
            startTime: timeString,
            duration: validatedData.duration,
            status: "ACTIVE",
          },
        });

        if (existingSlot) {
          throw new Error("You already have a recurring slot at this time");
        }

        // Create recurring slot with the per-lesson price
        const recurringSlot = await tx.recurringSlot.create({
          data: {
            teacherId: validatedData.teacherId,
            studentId: validatedData.studentId,
            dayOfWeek,
            startTime: timeString,
            duration: validatedData.duration,
            perLessonPrice: lessonPrice, // Use the calculated price from teacher's settings
            status: "ACTIVE",
          },
        });

        // Create the first lesson for this week (store in UTC)
        const firstLesson = await tx.lesson.create({
          data: {
            teacherId: validatedData.teacherId,
            studentId: validatedData.studentId,
            date: lessonDateUTC,
            duration: validatedData.duration,
            status: "SCHEDULED",
            isRecurring: true,
            recurringSlotId: recurringSlot.id,
          },
        });

        return { type: "recurring", recurringSlot, firstLesson };
      }
    });

    // Handle successful transaction result
    if (result.type === "single") {
      return createSuccessResponse(result.lesson, "Single lesson created successfully");
    } else {
      return createSuccessResponse(
        {
          recurringSlot: result.recurringSlot,
          firstLesson: result.firstLesson
        },
        "Created indefinite recurring lesson"
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }
    return handleApiError(error);
  }
}