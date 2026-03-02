import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LessonStatus } from "@prisma/client";
import { z } from "zod";
import { toZonedTime } from "date-fns-tz";
import { formatDateInTimezone, formatTimeInTimezone } from "@/lib/utils";
import { addWeeks } from "date-fns";
import {
  createSuccessResponse,
  createAuthErrorResponse,
  createNotFoundResponse,
  createBadRequestResponse,
  createConflictResponse,
  createValidationErrorResponse,
  handleApiError,
} from "@/lib/api-responses";
import { sendEmail, checkEmailPreference } from "@/lib/email";
import { renderEmailWithFallback } from "@/lib/email-templates";
import { emailLog } from "@/lib/logger";

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

    const teacherTimezone = teacher?.timezone || "America/Chicago";

    // Convert UTC date to teacher's timezone for availability checking
    const lessonDateUTC = new Date(validatedData.date);
    const lessonDateInTeacherTZ = toZonedTime(lessonDateUTC, teacherTimezone);
    const dayOfWeek = lessonDateInTeacherTZ.getDay();
    const hours = lessonDateInTeacherTZ.getHours();
    const minutes = lessonDateInTeacherTZ.getMinutes();
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;

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
      return createBadRequestResponse(
        "This time slot is not within your availability",
      );
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
      return createConflictResponse(
        "This time slot already has a lesson scheduled",
      );
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
            in: [LessonStatus.SCHEDULED],
          },
        },
      });

      if (conflict) {
        throw new Error("This time slot was just booked by another lesson");
      }

      // Get teacher's lesson settings for pricing
      const teacher = await tx.teacherProfile.findUnique({
        where: { id: validatedData.teacherId },
        include: { lessonSettings: true },
      });

      if (!teacher?.lessonSettings) {
        throw new Error(
          "Please complete your account before booking lessons. Go to Settings to complete your profile, payment methods, lesson settings, and availabilty.",
        );
      }

      // Calculate the price based on duration
      const lessonPrice =
        validatedData.duration === 30
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
            status: LessonStatus.SCHEDULED,
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
            status: LessonStatus.SCHEDULED,
            isRecurring: true,
            recurringSlotId: recurringSlot.id,
          },
        });

        // Generate the next 11 weeks of lessons (12 weeks total including first lesson)
        const futureLessons = [];
        let nextLessonDate = new Date(lessonDateUTC);

        for (let week = 1; week <= 11; week++) {
          nextLessonDate = addWeeks(nextLessonDate, 1);
          futureLessons.push({
            teacherId: validatedData.teacherId,
            studentId: validatedData.studentId,
            date: new Date(nextLessonDate), // Create new Date instance to avoid mutation
            duration: validatedData.duration,
            status: LessonStatus.SCHEDULED,
            isRecurring: true,
            recurringSlotId: recurringSlot.id,
          });
        }

        // Create all future lessons in one batch
        if (futureLessons.length > 0) {
          await tx.lesson.createMany({
            data: futureLessons,
            skipDuplicates: true,
          });
        }

        return { type: "recurring", recurringSlot, firstLesson };
      }
    });

    // Get student and teacher user details for email notification
    const studentUser = await prisma.user.findUnique({
      where: { id: student.userId },
      select: { id: true, email: true, name: true },
    });

    const teacherUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    // Format dates for email in teacher's timezone
    const lessonDate = formatDateInTimezone(lessonDateUTC, teacherTimezone);
    const lessonTime = formatTimeInTimezone(lessonDateUTC, teacherTimezone);

    // Get day of week name for recurring lessons (e.g., "Monday", "Tuesday")
    const dayOfWeekNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const lessonDayOfWeek = dayOfWeekNames[dayOfWeek];

    // Send confirmation email asynchronously (non-blocking)
    if (studentUser?.email && studentUser.id) {
      // Determine email type based on booking type
      const emailType =
        validatedData.type === "recurring"
          ? "LESSON_BOOKING_RECURRING"
          : "LESSON_BOOKING";

      // Check if student has opted-in to lesson booking emails
      const shouldSend = await checkEmailPreference(studentUser.id, emailType);

      if (shouldSend) {
        // Prepare email variables
        const emailVariables: Record<string, string | number> = {
          studentName: studentUser.name || "Student",
          teacherName: teacherUser?.name || "Your Teacher",
          lessonDate,
          lessonTime,
          duration: validatedData.duration,
        };

        // Add day of week for recurring lessons
        if (validatedData.type === "recurring") {
          emailVariables.lessonDayOfWeek = lessonDayOfWeek;
        }

        // Send email asynchronously (don't await, don't block response)
        renderEmailWithFallback(emailType as any, emailVariables)
          .then((emailTemplate) =>
            sendEmail({
              to: studentUser.email!,
              subject: emailTemplate.subject,
              html: emailTemplate.html,
            }),
          )
          .then((emailSent) => {
            if (emailSent) {
              emailLog.info("Lesson booking confirmation sent", {
                studentEmail: studentUser.email,
                lessonType: validatedData.type,
                lessonDate,
              });
            }
          })
          .catch((emailError) => {
            emailLog.error("Failed to send booking confirmation", {
              error:
                emailError instanceof Error
                  ? emailError.message
                  : String(emailError),
              studentEmail: studentUser.email,
            });
            // Don't fail the booking if email fails
          });
      } else {
        emailLog.info("Booking confirmation not sent - user opted out", {
          studentEmail: studentUser.email,
          emailType: "LESSON_BOOKING",
        });
      }
    }

    // Handle successful transaction result
    if (result.type === "single") {
      return createSuccessResponse(
        result.lesson,
        "Single lesson created successfully",
      );
    } else {
      return createSuccessResponse(
        {
          recurringSlot: result.recurringSlot,
          firstLesson: result.firstLesson,
        },
        "Created indefinite recurring lesson",
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createValidationErrorResponse(error);
    }
    return handleApiError(error);
  }
}
