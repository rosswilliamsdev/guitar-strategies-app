import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

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
      return NextResponse.json(
        { message: "Unauthorized - Teacher access required" },
        { status: 401 }
      );
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
      return NextResponse.json(
        { message: "Student not found or not assigned to this teacher" },
        { status: 404 }
      );
    }

    // Check teacher's availability for the requested time
    const lessonDate = new Date(validatedData.date);
    const dayOfWeek = lessonDate.getDay();
    const hours = lessonDate.getHours();
    const minutes = lessonDate.getMinutes();
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
      return NextResponse.json(
        { message: "This time slot is not within your availability" },
        { status: 400 }
      );
    }

    // Check for conflicts
    const endTime = new Date(lessonDate);
    endTime.setMinutes(endTime.getMinutes() + validatedData.duration);

    const conflict = await prisma.lesson.findFirst({
      where: {
        teacherId: validatedData.teacherId,
        date: {
          gte: lessonDate,
          lt: endTime,
        },
        status: {
          in: ["SCHEDULED"],
        },
      },
    });

    if (conflict) {
      return NextResponse.json(
        { message: "This time slot already has a lesson scheduled" },
        { status: 400 }
      );
    }

    if (validatedData.type === "single") {
      // Create single lesson
      const lesson = await prisma.lesson.create({
        data: {
          teacherId: validatedData.teacherId,
          studentId: validatedData.studentId,
          date: lessonDate,
          duration: validatedData.duration,
          status: "SCHEDULED",
        },
      });

      return NextResponse.json(lesson);
    } else {
      // Create indefinite recurring slot
      const lessonDate = new Date(validatedData.date);
      const dayOfWeek = lessonDate.getDay();
      const hours = lessonDate.getHours();
      const minutes = lessonDate.getMinutes();
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

      // Check for existing recurring slot conflicts
      const existingSlot = await prisma.recurringSlot.findFirst({
        where: {
          teacherId: validatedData.teacherId,
          dayOfWeek,
          startTime: timeString,
          duration: validatedData.duration,
          status: "ACTIVE",
        },
      });

      if (existingSlot) {
        return NextResponse.json(
          { message: "You already have a recurring slot at this time" },
          { status: 400 }
        );
      }

      // Create recurring slot
      const recurringSlot = await prisma.recurringSlot.create({
        data: {
          teacherId: validatedData.teacherId,
          studentId: validatedData.studentId,
          dayOfWeek,
          startTime: timeString,
          duration: validatedData.duration,
          monthlyRate: 0, // Set based on teacher's rate
          status: "ACTIVE",
        },
      });

      // Create the first lesson for this week
      const firstLesson = await prisma.lesson.create({
        data: {
          teacherId: validatedData.teacherId,
          studentId: validatedData.studentId,
          date: lessonDate,
          duration: validatedData.duration,
          status: "SCHEDULED",
          isRecurring: true,
          recurringSlotId: recurringSlot.id,
        },
      });

      return NextResponse.json({
        message: "Created indefinite recurring lesson",
        recurringSlot,
        firstLesson,
      });
    }
  } catch (error) {
    console.error("Error booking lesson for student:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request data", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Failed to book lesson" },
      { status: 500 }
    );
  }
}